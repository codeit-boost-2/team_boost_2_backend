import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://teamboost2.zogakzip.s3-website.eu-north-1.amazonaws.com", // 접근 권한을 부여하는 도메인
    credentials: true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
    optionsSuccessStatus: 200, // 응답 상태 200으로 설정
}));

import groupRouter from './router/groupRouter.js';
import memoryRouter from './router/memoryRouter.js';
import commentRouter from './router/commentRouter.js';

app.use('/images', express.static(`${process.env.IMAGE_DIR}`));
// http://localhost:3000/images/sdad.jpg

// 라우트 설정
app.use('/groups', groupRouter);
app.use('/memories', memoryRouter);
app.use('/comments', commentRouter);

// 서버 시작
app.listen(3000, () => console.log(`http://localhost:${process.env.PORT}`));