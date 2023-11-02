import { debug } from '../util/log';
import { apnProvider, dataSource } from '../index';
import { Account } from '../entity/Account';
import { LessThanOrEqual } from 'typeorm';
import { getLastReply } from '../lemmy/getNotifications';
import * as apn from 'apn';
import { ReplyNotification } from '../types/Notification';

const CHECK_INTERVAL = Number(process.env.CHECK_INTERVAL) * 1000;

export class Worker {
  public readonly interval: number;
  private readonly instance: string;
  private accounts: Account[] | undefined;

  constructor(instance, interval) {
    this.instance = instance;
    this.interval = interval;

    // Start doing work
    void this.startFetching();
    void this.startWorking();
  }

  private async loadAccounts(): Promise<void> {
    // If we still have remaining accounts, we want to finish those before we try again.
    if (this.accounts != null && this.accounts.length > 0) {
      debug(`Accounts still remaining for ${this.instance}.`);
      return;
    }

    // Load the accounts
    debug(`Loading accounts for ${this.instance}.`);
    const time = Date.now();

    // Find all accounts where the last check is less than the check interval.
    // We want this to be descending so we can use .pop() to get the next account.
    this.accounts = await dataSource.manager.find(Account, {
      where: {
        instance: this.instance,
        lastCheck: LessThanOrEqual(time - CHECK_INTERVAL),
      },
      order: {
        lastCheck: 'DESC',
      },
      relations: ['tokens'],
    });
  }

  private async work(): Promise<void> {
    // Get the next account
    const account = this.getNext();
    debug(`Working on ${account?.username}.`);

    // If there's no account then we don't need to do anything.
    if (account == null) {
      debug(`No account found for ${this.instance}.`);
      return;
    }

    // Update the last check time
    account.lastCheck = Date.now();

    // Get the last reply from Lemmy
    const lastReply = await getLastReply(account.instance, account.authToken);

    // If there's no last reply then we don't need to do anything.
    if (lastReply == null || lastReply.commentId === account.lastNotifiedId) {
      await dataSource.manager.save(account);
      return;
    }

    debug(`New notification for ${account.username}.`);

    // Send the notification
    this.sendNotification(account, lastReply);

    account.lastNotifiedId = lastReply.commentId;
    await dataSource.manager.save(account);
  }

  private sendNotification(account: Account, reply: ReplyNotification): void {
    // Create a new notification
    const notification = new apn.Notification();

    // Configure the notification
    notification.expiry = Math.floor(Date.now() / 1000) + 3600;
    notification.badge = 1;
    notification.sound = 'ping.aiff';
    notification.alert = `${reply.senderName} said: ${reply.content}`;
    notification.payload = reply;
    notification.topic = 'com.gkasdorf.memmyapp';

    console.log(account.tokens);

    // Send the notification to all tokens
    void apnProvider
      .send(
        notification,
        account.tokens.map((token) => token.token),
      )
      .then((response) => {
        debug(`Sent notification to ${account.username}.`);
        console.log(JSON.stringify(response));
      })
      .catch((error) => {
        debug(`Error sending notification to ${account.username}.`);
        console.log(JSON.stringify(error));
      });
  }

  private getNext(): Account | undefined {
    // If there's no accounts then we don't need to do anything.
    if (this.accounts == null || this.accounts.length < 1) return undefined;

    // Get the next account
    const account = this.accounts.pop();

    return account;
  }

  private async startFetching(): Promise<void> {
    // Load the accounts
    void this.loadAccounts();

    // Load the accounts every minute
    setInterval(() => {
      void this.loadAccounts();
    }, 60 * 1000);
  }

  private async startWorking(): Promise<void> {
    // Do the work
    void this.work();

    // Do the work every X seconds
    setInterval(() => {
      void this.work();
    }, this.interval * 1000);
  }
}
