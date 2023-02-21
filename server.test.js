const request = require('supertest')
const { app } = require('./server')
const { carts, addItemToCart } = require('./cartController')
const { inventory } = require('./inventoryController')
const { users, hashPassword } = require('./authenticationController')

const user = 'test_user'
const password = 'a_password'
const validAuth = Buffer.from(`${user}:${password}`).toString('base64')
const authHeader = `Basic ${validAuth}`
const createUser = () => {
  users.set(user, {
    email: 'test_user@example.org',
    passwordHash: hashPassword(password),
  })
}

afterEach(() => users.clear())
afterAll(() => app.close())
afterEach(() => inventory.clear())

describe('create accounts', () => {
  test('creating a new account', async () => {
    const response = await request(app)
      .put('/users/test_user')
      .send({ email: 'test_user@example.org', password: 'a_password' })
      .expect(200)
      .expect('Content-Type', /json/)

    expect(response.body).toEqual({
      message: 'test_user created successfully.',
    })
    expect(users.get('test_user')).toEqual({
      email: 'test_user@example.org',
      passwordHash: hashPassword('a_password'),
    })
  })
})

describe('add items to a cart', () => {
  beforeEach(createUser)
  // test('adding available items', async () => {
  //   console.log({ inventory, step: 1 })
  //   inventory.clear()
  //   inventory.set('cheesecake', 1)
  //   const response = await request(app)
  //     .post('/carts/test_user/items/cheesecake')
  //     .set('authorization', authHeader)
  //     .expect(200)
  //     .expect('Content-Type', /json/)

  //   expect(response.body).toEqual(['cheesecake'])
  //   expect(inventory.get('cheesecake')).toEqual(0)
  //   expect(carts.get('test_user')).toEqual(['cheesecake'])
  // })

  test('adding available items', async () => {
    inventory.set('cheesecake', 3)
    const response = await request(app)
      .post('/carts/test_user/items')
      .set('authorization', authHeader)
      .send({ item: 'cheesecake', quantity: 3 })
      .expect(200)
      .expect('Content-Type', /json/)

    const newItems = ['cheesecake', 'cheesecake', 'cheesecake']
    expect(response.body).toEqual(newItems)
    expect(inventory.get('cheesecake')).toEqual(0)
    expect(carts.get('test_user')).toEqual(newItems)
  })
})
