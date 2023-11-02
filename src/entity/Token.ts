import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './Account';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public type: 'ios' | 'android';

  @Column()
  public token: string;

  @ManyToOne(() => Account, (account) => account.tokens)
  public account: Account;
}
