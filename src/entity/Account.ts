import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Token } from './Token';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public instance: string;

  @Column()
  public username: string;

  @Column()
  public authToken: string;

  @Column()
  public lastCheck: number;

  @Column()
  public lastNotifiedId: number;

  @OneToMany(() => Token, (token) => token.account)
  tokens: Token[];
}
