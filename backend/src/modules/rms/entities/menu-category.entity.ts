import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Menu } from './menu.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menu_categories')
export class MenuCategory extends BaseEntity {
  @Column({ type: 'uuid' })
  menuId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => Menu, (menu) => menu.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu: Menu;

  @OneToMany(() => MenuItem, (item) => item.category, { cascade: true })
  items: MenuItem[];
}

