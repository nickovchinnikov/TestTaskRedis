const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const moment = require('moment');
const RedisClient = require('then-redis');

const app = new Koa();
const router = new KoaRouter();
const db = RedisClient.createClient();
const subscriber = RedisClient.createClient();

router.get('/', async ctx => {
    ctx.body = 'Hello World!';
});

router.post('/echoAtTime', async ctx => {
    const {time, message} = ctx.request.body;
    db.set(time, message);
    subscriber.subscribe('JobChannel').then(() => {
        db.publish('JobChannel', time)
    });
    ctx.body = 'Task created!';
});

const planner = jobTime => {
    const currentTime = moment().format('HH:mm:ss');
    const timeStart = new Date("01/01/2007 " + currentTime);
    const timeEnd = new Date("01/01/2007 " + jobTime);
    const diff = timeEnd - timeStart;
    const time = diff < 0 ? 24 * 3600 * 1000 - diff : diff;
    setTimeout(async () => {
        const result = await db.get(jobTime);
        if (result) {
            console.log(`${jobTime} ${result}`);
        }
        db.del(jobTime);
    }, time);
};

subscriber.on('message', (channel, message) => {
    if (channel === 'JobChannel') {
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
