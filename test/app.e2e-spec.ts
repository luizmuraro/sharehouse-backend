import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Note: booting AppModule connects to MongoDB (MongooseModule.forRootAsync), so
// this e2e requires a reachable MONGO_URI + valid env to run.
describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns 404 for an unknown route', () => {
    return request(app.getHttpServer()).get('/does-not-exist').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
