import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler.js';
import { getCommentList } from './commentRouter.js';
import { upload } from '../utils/multer.js';
import { getHashtagListByMemoryId } from '../utils/hashtag.js';

const prisma = new PrismaClient();
const memoryRouter = express.Router();
memoryRouter.use(express.json());

// 추억 목록 조회 (그룹 상세 정보 조회를 위해 함수로 분리)
export async function getMemoryList({ groupId, page, pageSize, sortBy, keyword, isPublic}) {
  console.log(groupId);
  console.log(isPublic);

  const where = {
    groupId,
    isPublic,
    title: {
      contains: keyword === 'null' ? '' : keyword,
    },
  };

  let orderBy;
  switch (sortBy) {
    case 'mostCommented':
      orderBy = { _count: { comments: 'desc' } };
      break;
    case 'mostLiked':
      orderBy = { likeCount: 'desc' };
      break;
    default: // latest
      orderBy = { createdAt: 'desc' };
  }

  const [totalItemCount, posts] = await Promise.all([
    prisma.memory.count({ where }),
    prisma.memory.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        nickname: true,
        title: true,
        image: true,
        location: true,
        moment: true,
        isPublic: true,
        likeCount: true,
        _count: { select: { comments: true } },
        createdAt: true,
      },
    }),
  ]);

  const data = posts.map(post => ({
    id: post.id,
    nickname: post.nickname,
    title: post.title,
    image: post.image,
    location: post.location,
    moment: post.moment,
    isPublic: post.isPublic,
    likeCount: post.likeCount,
    commentCount: post._count.comments,
    createdAt: post.createdAt,
    hashtag: getHashtagListByMemoryId(post.id)
  }));

  return {
    totalItemCount,
    data,
  };
};

memoryRouter.route('/:id/verifyPassword')  

  // 추억 조회 권한 확인
  .post(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    const post = await prisma.memory.findUnique({
      where: { id },
      select: {
        password: true,
      }
    });

    if (post.password === password) {
      return res.status(200).json({ message: '비밀번호가 확인되었습니다' });
    } else {
      return res.status(401).json({ message: '비밀번호가 틀렸습니다' });
    }
  }));

memoryRouter.route('/:id/like')

  // 추억 공감하기
  .post(asyncHandler(async (req, res) => {
    const { id } = req.params;

    const post = await prisma.memory.findUnique({
      where: { id },
    });

    const group = await prisma.group.findUniqueOrThrow({
      where: { id: post.groupId}
    });

    if (!post) {
      return res.status(404).json({ message: '존재하지 않습니다' });
    }

    await prisma.memory.update({
      where: { id },
      data: {
        likeCount: {
          increment: 1
        }
      }
    });

    await prisma.group.update({
      where: { id: post.groupId },
      data: {
        likeCount: {
          increment: 1
        }
      }
    });

    if (group.likeCount == 10) {
      const badge = await prisma.groupBadge.create({
        data: {
          groupId: post.groupId,
          badgeName: '공감왕',
        },
      });
    };

    return res.status(200).json({ message: '게시글 공감하기 성공' });
  }));

memoryRouter.route('/:id/isPublic')

  // 추억 공개 여부 확인
  .get(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const memory = prisma.memory.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        isPublic: true,
      },
    });

    return res.status(200).send(memory)
  }));

memoryRouter.route('/:id')

  // 추억 수정
  .put(upload.single("image"), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nickname, title, content, password, location, moment } = req.body;
    let isPublic = req.body.isPublic;
    if (isPublic === 'true') isPublic = true;
    else isPublic = false;

    const image = `${req.file.filename}`;

    if (!nickname || !title || !content || !password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const post = await prisma.memory.findUnique({
      where: { id },
      select: {
        password: true,
      }
    });

    if (!post) {
      return res.status(404).json({ message: '존재하지 않습니다' });
    }

    if (post.password !== password) {
      return res.status(403).json({ message: '비밀번호가 틀렸습니다' });
    }

    const updatedPost = await prisma.memory.update({
      where: { id },
      data: {
        nickname,
        title,
        content,
        image,
        location,
        moment: new Date(moment),
        isPublic
      }
    });

    return res.status(200).json(updatedPost);
  }))

  // 추억 삭제
  .delete(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const post = await prisma.memory.findUnique({
      where: { id },
      select: {
        password: true,
      }
    });

    if (!post) {
      return res.status(404).json({ message: '존재하지 않습니다' });
    }

    if (post.password !== password) {
      return res.status(403).json({ message: '비밀번호가 틀렸습니다' });
    }

    await prisma.memory.delete({
      where: { id },
    });

    return res.status(200).json({ message: '게시글 삭제 성공' });
  }));

memoryRouter.route('/:id/comments')

  // 추억 상세 정보 조회 (댓글 목록 조회)
  .get(asyncHandler(async (req, res) => {
    console.log("추억 상세 정보 조회");
    const { id } = req.params;
    
    if ( !id ) {
      return res.status(400).send({ message: "잘못된 요청입니다" });
    };

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id },
    });

    memory.hashtag = getHashtagListByMemoryId(id);

    const commentResult = await getCommentList({
      memoryId: id
    });

    return res.status(200).send({
      memory,
      comments: {
        totalcommentCount: commentResult.totalCommentCount,
        data: commentResult.data,
      },
    });
  }));

  memoryRouter.route('/:memoryId/comments')

  // 댓글 등록
  .post(asyncHandler(async (req, res) => {
    const { memoryId } = req.params;
    const { nickname, content, password } = req.body;

    if (!nickname || !content || !password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const comment = await prisma.comment.create({
      data: {
        memoryId,
        nickname,
        content,
        password
      },
    });
    return res.status(201).send(comment);
  })); 
  
export default memoryRouter;