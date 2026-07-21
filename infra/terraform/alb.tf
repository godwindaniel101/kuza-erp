# alb.tf
# Public Application Load Balancer. Routing:
#   - default            -> frontend target group (Next.js :3000)
#   - /api/*, /uploads/* -> backend target group  (NestJS :4001, global prefix /api,
#                            static uploads served at /uploads/*)
#
# Listeners:
#   - HTTP:80 always exists. If a cert is configured it 301-redirects to HTTPS; otherwise
#     it serves traffic directly.
#   - HTTPS:443 exists only when var.certificate_arn is set.
# Path-based rules are attached to whichever listener is "active" (443 if cert, else 80).

resource "aws_lb" "main" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${local.name}-alb" }
}

# --- Target groups (target_type = ip, required for Fargate awsvpc networking) ---
resource "aws_lb_target_group" "frontend" {
  name        = "${local.name}-fe-tg"
  port        = var.frontend_container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name}-fe-tg" }
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name}-be-tg"
  port        = var.backend_container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  # Backend exposes GET /api/health (global prefix 'api').
  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name}-be-tg" }
}

# --- HTTP:80 listener ---
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # With a cert: redirect everything to HTTPS. Without: serve the frontend directly.
  dynamic "default_action" {
    for_each = var.certificate_arn != "" ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.certificate_arn == "" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.frontend.arn
    }
  }
}

# --- HTTPS:443 listener (only when a cert is provided) ---
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

locals {
  # Attach path rules to the listener that actually serves app traffic.
  active_listener_arn = var.certificate_arn != "" ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}

# Route API + uploads traffic to the backend; everything else falls through to the
# frontend default action.
resource "aws_lb_listener_rule" "backend" {
  listener_arn = local.active_listener_arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/uploads/*"]
    }
  }
}
