const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-body-parser');

const {
  users,
  hashPassword,
  authenticationMiddleware,
} = require('./authenticationController');

const app = new Koa();
const router = new Router();

app.use(bodyParser());
app.use(async (ctx, next) => {
  if (ctx.url.startsWith('/carts')) {
    return await authenticationMiddleware(ctx, next);
  }
  await next();
});

const { carts, addItemToCart } = require('./cartController');
const { inventory } = require('./cartController');

router.put('/users/:username', (ctx) => {
  const { username } = ctx.params;
  const { email, password } = ctx.request.body;
  const userAlreadyExists = users.has(username);
  if (userAlreadyExists) {
    ctx.body = { message: `${username} already exists` };
    ctx.status = 409;
    return;
  }

  users.set(username, { email, passwordHash: hashPassword(password) });
  return (ctx.body = { message: `${username} created successfully.` });
});

router.post('/carts/:username/items', (ctx) => {
  const { username } = ctx.params;
  const { item, quantity } = ctx.request.body;

  for (let i = 0; i < quantity; i++) {
    try {
      const newItems = addItemToCart(username, item);
      ctx.body = newItems;
    } catch (e) {
      ctx.body = { message: e.message };
      ctx.status = e.code;
      return;
    }
  }
});

router.get('/carts/:username/items', (ctx) => {
  const cart = carts.get(ctx.params.username);
  cart ? (ctx.body = cart) : (ctx.status = 404);
});

router.post('/carts/:username/items/:item', (ctx) => {
  try {
    const { username, item } = ctx.params;
    const newItems = addItemToCart(username, item);
    ctx.body = newItems;
  } catch (e) {
    ctx.body = { message: e.message };
    ctx.status = e.code;
    return;
  }
});

router.post('__/carts/:username/items/:item', (ctx) => {
  const { username, item } = ctx.params;
  console.log({ username, item });
  const isAvailable = inventory.has(item) && inventory.get(item) > 0;
  if (!isAvailable) {
    ctx.body = { message: `${item} is unavailable` };
    ctx.status = 400;
    return;
  }
  const newItems = (carts.get(username) || []).concat(item);
  carts.set(username, newItems);
  inventory.set(item, inventory.get(item) - 1);
  ctx.body = newItems;
});

router.delete('/carts/:username/items/:item', (ctx) => {
  const { username, item } = ctx.params;
  if (!carts.has(username) || !carts.get(username).includes(item)) {
    ctx.body = { message: `${item} is not in the cart` };
    ctx.status = 400;
    return;
  }
  const newItems = (carts.get(username) || []).filter((i) => i !== item);
  inventory.set(item, (inventory.get(item) || 0) + 1);
  carts.set(username, newItems);
  ctx.body = newItems;
});

app.use(router.routes());

module.exports = {
  app: app.listen(3000),
};
