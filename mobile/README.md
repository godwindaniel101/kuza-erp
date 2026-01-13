# ERP Mobile App - Flutter

## Setup

1. Install Flutter SDK (3.0+)
2. Install dependencies:
```bash
flutter pub get
```

3. Initialize API service:
Update `lib/services/api_service.dart` with your backend URL:
```dart
ApiService().initialize(baseUrl: 'http://your-backend-url/api');
```

4. Run the app:
```bash
flutter run
```

## Features

- Authentication (Login/Register)
- Menu Browsing
- Inventory Management
- Sales Management

## Project Structure

```
lib/
├── main.dart              # App entry point
├── router/                # Navigation routing
├── screens/               # UI screens
│   ├── auth/             # Authentication screens
│   ├── home/             # Home screen
│   ├── rms/              # RMS screens
│   └── ims/              # IMS screens
├── services/              # API services
├── widgets/               # Reusable widgets
├── models/                # Data models
└── theme/                 # App theme
```

