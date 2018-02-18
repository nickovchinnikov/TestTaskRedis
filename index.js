const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const redis = require("redis");

const app = new Koa();
const router = new KoaRouter();
const RedisClient = redis.createClient();

router.get('/', async ctx => {
    ctx.body = 'Hello World!';
});

router.post('/echoAtTime', async ctx => {
    ctx.body = 'Hello World!';
});

app
    .use(bodyParser())
    .use(router.routes())
    .listen(3000);
