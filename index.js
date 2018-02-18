const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const moment = require('moment');
const thenRedisClient = require('then-redis');

const app = new Koa();
const router = new KoaRouter();
const db = thenRedisClient.createClient();

router.get('/', async ctx => {
    ctx.body = 'Hello World!';
});

router.post('/echoAtTime', async ctx => {
    const {time, message} = ctx.request.body;
    db.set(time, message);
    ctx.body = 'Task created!';
});

setInterval(async () => {
    const time = moment().format('HH:mm');
    const result = await db.get(time);
    if (result) {
        console.log(result);
    }
    db.del(time);
}, 5000);

app
    .use(bodyParser())
    .use(router.routes())
    .listen(3000);
