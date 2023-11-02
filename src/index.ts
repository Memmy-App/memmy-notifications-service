import { AppDataSource } from './data-source';
import { DataSource } from 'typeorm';
import { debug, log } from './util/log';
import { WorkerList } from './types/WorkerList';
import { Worker } from './worker/Worker';
import * as apn from 'apn';

export let dataSource: DataSource;
export let apnProvider: apn.Provider;
const workers: WorkerList = new Map<string, Worker>();

const MIN_INTERVAL = Number(process.env.MIN_INTERVAL);
const WORKER_UPDATE_INTERVAL =
  Number(process.env.WORKER_UPDATE_INTERVAL) * 1000;

const APN_OPTIONS = {
  token: {
    key: process.env.APN_KEY_PATH,
    keyId: process.env.APN_KEY_ID,
    teamId: process.env.APN_TEAM_ID,
  },
  production: process.env.APN_PRODUCTION === 'true',
};

const initialize = async (): Promise<void> => {
  log('Initializing...');

  try {
    dataSource = await AppDataSource.initialize();
  } catch (e: any) {
    log('Error occurred while connecting to the database.');
    console.log(e);
    return;
  }

  try {
    apnProvider = new apn.Provider(APN_OPTIONS as apn.ProviderOptions);
  } catch (e: any) {
    log('Error occurred while connecting to APN.');
    console.log(e);
    return;
  }

  log('Data source created successfully.');
  log('Getting instances');

  // Setup the initial workers
  void setupWorkers();

  // Setup workers every X seconds
  setInterval(() => {
    void setupWorkers();
  }, WORKER_UPDATE_INTERVAL);
};

const setupWorkers = async (): Promise<void> => {
  // We want to create some worker processes now. We know the rate limit is [REDACTED] so we will follow something
  // along those lines.

  log('Setting up workers...');

  const usersByInstance = await dataSource
    .createQueryBuilder()
    .select(['instance', 'COUNT(*) as cnt'])
    .from('accounts', 'accounts')
    .groupBy('instance')
    .orderBy('cnt', 'DESC')
    .getRawMany();

  log('Retrieved instance counts.');

  usersByInstance.forEach((row) => {
    // Get the workers
    const currentInstance = workers.get(row.instance);
    // Get the needed interval
    const neededInterval = (11 - Math.ceil(row.cnt / 10)) * 0.1;
    // Get the lowest allowed interval
    const allowedInterval = Math.max(neededInterval, MIN_INTERVAL);
    // Get the number of current workers

    // If we need to we will add workers

    if (currentInstance == null || allowedInterval < currentInstance.interval) {
      // Clear old intervals if needed
      currentInstance?.quit();

      // Create a new worker
      const newWorker = new Worker(row.instance, allowedInterval);

      // Update the workers map
      workers.set(row.instance, newWorker);

      debug(`Added worker for ${row.instance} at interval ${allowedInterval}.`);
    } else {
      debug(`No new worker needed for ${row.instance}`);
    }
  });
};

// Start em up!
void initialize();
