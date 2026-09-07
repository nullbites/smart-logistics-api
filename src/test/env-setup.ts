process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://logistics:logistics@localhost:5432/logistics_test?schema=public';
