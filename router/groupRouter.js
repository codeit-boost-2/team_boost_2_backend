import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler.js';
import { getMemoryList } from './memoryRouter.js';
import { upload } from '../utils/multer.js';
import { getHashtagIdByWord } from '../utils/hashtag.js';

const prisma = new PrismaClient();
const groupRouter = express.Router();
groupRouter.use(express.json());

groupRouter.route('/:page/:pageSize')

  // 그룹 목록 조회
  .get(asyncHandler(async (req, res) => {
    const page = Number(req.params.page);
    const pageSize = Number(req.params.pageSize);
    const { sortBy, isPublic, keyword } = req.query;

    const where = {
      isPublic: isPublic === 'true',
      name: {
        contains: keyword === 'null' ? '' : keyword,
      },
    };

    let orderBy;
    switch (sortBy) {
      case 'mostPosted':
        orderBy = { _count: { memories: 'desc' } };
        break;
      case 'mostLiked':
        orderBy = { likeCount: 'desc' };
        break;
      default: // latest
        orderBy = { createdAt: 'desc' };
    }

    const [totalItemCount, groups] = await Promise.all([
      prisma.group.count({ where }),
      prisma.group.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          name: true,
          image: true,
          isPublic: true,
          likeCount: true,
          _count: { select: { memories: true } },
          createdAt: true,
          description: true,
        },
      }),
    ]);

    const data = groups.map(group => ({
      id: group.id,
      name: group.name,
      image: group.image,
      isPublic: group.isPublic,
      likeCount: group.likeCount,
      postCount: group._count.memories,
      createdAt: group.createdAt,
      introduction: group.description,
    }));

    res.status(200).json({
      currentPage: Number(page),
      totalPages: Math.ceil(totalItemCount / pageSize),
      totalItemCount,
      data,
    });
  }));

groupRouter.route('')

  // 그룹 등록
  .post(upload.single("image"), asyncHandler(async (req, res) => {
    const { groupName, groupDescription, password } = req.body;
    let isPublic = req.body.isPublic;
    if (isPublic === 'true') isPublic = true;
    else isPublic = false;

    const image = req.file ? `${req.file.filename}` : null;

    if (!groupName || !groupDescription || isPublic === undefined || !password) {
      return res.status(400).send({ message: "잘못된 요청입니다" });
    };

    const group = await prisma.group.create({
      data: {
        name: groupName,
        image,
        description: groupDescription,
        isPublic,
        password,
      },
    });
    return res.status(201).send(group);
  }));

groupRouter.route('/:id')

  // 그룹 수정
  .put(upload.single("image"), asyncHandler(async (req, res) => {
    console.log("그룹 수정");
    const { id } = req.params;
    const { name, password, description } = req.body;
    let isPublic = req.body.isPublic;
    if (isPublic === 'true') isPublic = true;
    else isPublic = false;

    const image = `${req.file.filename}`;

    console.log(id);
    console.log(name);
    console.log(password);
    console.log(image);
    console.log(isPublic);
    console.log(description);

    if (!password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    console.log("password 확인 완료");

    const group = await prisma.group.findUnique({
      where: { id },
      select: {
        password: true,
      }
    });

    if (!group) {
      return res.status(404).json({ message: '존재하지 않습니다' });
    }

    if (group.password !== password) {
      return res.status(403).json({ message: '비밀번호가 틀렸습니다' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { name, image, isPublic, description },
    });

    return res.status(200).json(updatedGroup);
  }))

  // 그룹 삭제
  .delete(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const group = await prisma.group.findUniqueOrThrow({
      where: { id },
    });

    if (!group) {
      return res.status(404).send({ message: "존재하지 않습니다 " });
    };

    if (group.password !== password) {
      return res.status(403).send({ message: "비밀번호가 틀렸습니다" });
    };

    await prisma.group.delete({
      where: { id },
    });

    return res.status(200).send({ message: "그룹 삭제 성공" });
  }));

groupRouter.route('/:id/like')

  // 그룹 공감하기
  .post(asyncHandler(async (req, res) => {
    const { id } = req.params;

    const group = await prisma.group.findUniqueOrThrow({
      where: { id },
    });

    if (!group) {
      return res.status(404).send({ message: "존재하지 않습니다" });
    };

    return res.status(200).send({ message: "그룹 공감하기 성공" });
  }));

groupRouter.route('/:id/verifyPassword')

  // 그룹 조회 권한 확인
  .post(asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const group = await prisma.group.findUniqueOrThrow({
      where: { id },
      select: {
        password: true,
      },
    });

    if (group.password === password) {
      return res.status(200).send({ message: "비밀번호가 확인되었습니다" });
    } else {
      return res.status(401).send({ message: "비밀번호가 틀렸습니다" });
    };
  }));

groupRouter.route('/:id/:page/:pageSize')

  // 그룹 상세 정보 조회 (추억 목록 조회)
  .get(asyncHandler(async (req, res) => {
    console.log("그룹 상세 정보 조회");
    const { id } = req.params;
    const page = Number(req.params.page);
    const pageSize = Number(req.params.pageSize);
    const { sortBy, isPublic, keyword } = req.query;

    console.log(id);
    console.log(page);
    console.log(pageSize);

    if (!id || !page || !pageSize) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        likeCount: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const badge = await prisma.groupBadge.findMany({
      where: { groupId : id },
      select: {
        badgeName: true,
      },
    });

    console.log(group);

    const memoriesResult = await getMemoryList({
      groupId: id,
      page: Number(page),
      pageSize: Number(pageSize),
      sortBy,
      keyword: keyword === 'null' ? '' : keyword,
      isPublic: isPublic === 'true',
    });

    console.log(memoriesResult);

    return res.status(200).json({
      group,
      badge,
      memories: {
        currentPage: page,
        totalPages: Math.ceil(memoriesResult.totalItemCount / pageSize),
        totalItemCount: memoriesResult.totalItemCount,
        data: memoriesResult.data,
      },
    });
  }));

groupRouter.route('/:groupId/posts')

  // 추억 등록
  .post(upload.single("image"), asyncHandler(async (req, res) => {
    console.log("추억 등록");
    const { groupId } = req.params;
    const { nickname, title, content, password, location, moment } = req.body;
    let isPublic = req.body.isPublic;
    if (isPublic === 'true') isPublic = true;
    else isPublic = false;

    const image = `${req.file.filename}`;

    if (!nickname || !title || !content || isPublic === undefined || !password) {
      return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    const memory = await prisma.memory.create({
      data: {
        groupId,
        nickname,
        title,
        image,
        content,
        location,
        isPublic,
        moment: new Date(moment),
        password,
      },
    });

    const hashtag = req.body.hashtag;
    console.log(hashtag);

    for (const tag of hashtag) {
      const hashtagId = getHashtagIdByWord(tag);
      await prisma.memoryHashtag.create({
        data: {
          memoryId: memory.id,
          hashtagId: hashtagId,
        }
      });
    }

    const group = await prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            memories: true,
          },
        },
      },
    });

    if (group._count.memories === 20) {
      await prisma.groupBadge.create({
        data: {
          groupId: group.id,
          badgeName: '추억왕',
        },
      });
    };

    return res.status(201).send(memory);
  }));

export default groupRouter;
