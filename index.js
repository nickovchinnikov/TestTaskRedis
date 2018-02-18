const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const moment = require('moment');
const RedisClient = require('then-redis');

const app = new Koa();
const router = new KoaRouter();
const db = RedisClient.createClient();
const subscriber = RedisClient.createClient();

const channelNameForSubscribes = 'ChannelForJobPlanning';

router.get('/', async ctx => {
    ctx.body = 'Hello World!';
});

router.post('/echoAtTime', async ctx => {
    const {time, message} = ctx.request.body;
    db.set(time, message);
    subscriber.subscribe(channelNameForSubscribes).then(() => {
        db.publish(channelNameForSubscribes, time)
    });
    ctx.body = 'Task created!';
});

const planner = jobTime => {
    const currentTime = moment().format('HH:mm:ss');
    const dummyDate = '01/01/2007';
    const timeStart = new Date(`${dummyDate} ${currentTime}`);
    const timeEnd = new Date(`${dummyDate} ${jobTime}`);
    const diff = timeEnd - timeStart;
    const mlsPerDay = 24 * 3600 * 1000;
    const timeout = diff < 0 ? mlsPerDay + diff : diff;
    setTimeout(async () => {
        const result = await db.get(jobTime);
        if (result) {
            console.log(`${jobTime} ${result}`);
            db.del(jobTime);
        }
    }, timeout);
};

subscriber.on('message', (channel, message) => {
    if (channel === channelNameForSubscribes) {
        planner(message);
    }
});

setImmediate(async () => {
    const keys = await db.keys('*');
    keys.forEach(planner);
});

app
    .use(bodyParser())
    .use(router.routes())
    .listen(3000);
