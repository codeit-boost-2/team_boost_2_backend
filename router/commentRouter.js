import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler.js';

const prisma = new PrismaClient();
const commentRouter = express.Router();
commentRouter.use(express.json());

// 댓글 목록 조회 (추억 정보 상세 조회를 위해 함수로 분리)
export async function getCommentList({ memoryId }) {

  const [totalCommentCount, comments] = await Promise.all([
    prisma.comment.count({ where: { memoryId } }),
    prisma.comment.findMany({
      where: { memoryId },
      select: {
        id: true,
        nickname: true,
        content: true,
        createdAt: true
      }
    })
  ]);
  
  const data = comments.map(comment => ({
    id: comment.id,
    nickname: comment.nickname,
    content: comment.content,
    createdAt: comment.createdAt,
  }));

  return {
    totalCommentCount,
    data
  };
}

commentRouter.route('/:id')

  // 댓글 수정
  .put(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nickname, content, password } = req.body;
    const comment = await prisma.comment.findUniqueOrThrow({
      where: { 
        id
      },
    });

    if (!comment) {
      return res.status(404).send({ message: "존재하지 않습니다"})
    }

    if (!nickname || !content || !password) {
      return res.status(400).send({ message: "잘못된 요청입니다"});
    };

    if (password === comment.password) {
      const updatedComment = await prisma.comment.update({
        where: { 
          id
        },
        data : req.body,
      });
      return res.status(200).send(updatedComment);
    } else {
      return res.status(403).send({ message: "비밀번호가 틀렸습니다" });
    };
  }))

  // 댓글 삭제
  .delete(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    const comment = await prisma.comment.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (!comment) {
      return res.status(404).send({ message: "존재하지 않습니다" });
    };

    if (password !== comment.password) {
      return res.status(403).send({ message: "비밀번호가 틀렸습니다" });
    };

    if (!password) {
      return res.status(400).send({ message: "잘못된 요청입니다" });
    };

    await prisma.comment.delete({
      where: {
        id,
      },
    });

    return res.status(200).send({ message: "답글 삭제 성공" });
  }));

export default commentRouter;