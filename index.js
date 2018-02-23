const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const moment = require('moment');
const RedisClient = require('then-redis');

const app = new Koa();
const router = new KoaRouter();
const db = RedisClient.createClient();
const subscriber = RedisClient.createClient();

const channelNameForJobPlanning = 'ChannelForJobPlanning';
const taskKeyInRedis = 'plannedTasks';
const dummyDate = '01/01/2007';

router.get('/', async (ctx) => {
    ctx.body = 'Hello World!';
});

router.post('/echoAtTime', async ctx => {
    const {time, message} = ctx.request.body;
    if(!/^[0-2]\d:[0-5]\d:[0-5]\d$/.test(time)) {
        ctx.status = 400;
        ctx.body = 'Invalid time format! Use 24h format, dear programmer!';
        return;
    }
    await subscriber.subscribe(channelNameForJobPlanning);
    const meta = {time, msg: message};
    db.publish(channelNameForJobPlanning, JSON.stringify(meta));
    ctx.body = 'Task created!';
});

const getCurrentTime = () => {
    return moment().format('HH:mm:ss');
};

const convertTimeJobToTimestamp = jobTime => {
    const timeJob = new Date(`${dummyDate} ${jobTime}`);
    return timeJob.getTime();
};

const findFirst = async startFromTimeStamp => {
    const result = await db.zrangebyscore(taskKeyInRedis, startFromTimeStamp, '+inf', 'WITHSCORES', 'LIMIT', 0, 1);
    const {runTime, jobTime, message, isLock} = result[0] ? JSON.parse(result[0]) : {};
    if (message && !isLock) {
        await db.zadd(taskKeyInRedis, runTime, JSON.stringify({runTime, jobTime, message, isLock: true}));
        return {jobTime, message, runTime, isLock};
    }
    if (isLock === true) {
        await runner(runTime + 1000);
    }
    return {};
};

const runner = async (startFrom = convertTimeJobToTimestamp(getCurrentTime())) => {
    const {jobTime, message, runTime} = await findFirst(startFrom);
    const currentTime = getCurrentTime();
    const timeStart = new Date(`${dummyDate} ${currentTime}`);
    const timeEnd = convertTimeJobToTimestamp(jobTime);
    const diff = timeEnd - timeStart;
    const mlsPerDay = 24 * 3600 * 1000;
    const timeout = diff < 0 ? mlsPerDay + diff : diff;
    if (jobTime && message) {
        setTimeout(async () => {
            console.log(`${jobTime} ${message}`);
            db.del(taskKeyInRedis, runTime);
        }, timeout);
        await runner(runTime + 1000);
    }
    return true;
};

const planner = async (jobTime, message) => {
    const runTime = convertTimeJobToTimestamp(jobTime);
    await db.zadd(taskKeyInRedis, runTime, JSON.stringify({runTime, jobTime, message}));
    await runner();
};

subscriber.on('message', async (channel, message) => {
    if (channel === channelNameForJobPlanning) {
        const {time, msg} = JSON.parse(message);
        await planner(time, msg);
    }
});

setImmediate(async () => {
    await runner();
});

app
    .use(bodyParser())
    .use(router.routes())
    .listen(3000);
