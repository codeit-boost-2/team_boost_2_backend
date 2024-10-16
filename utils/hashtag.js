import express from 'express';
import { PrismaClient } from '@prisma/client';
import shorthash from 'shorthash';

const prisma = new PrismaClient();

export async function getHashtagListByMemoryId(memoryId) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: {
      memoryHashtag: {
        include: {
          hashtag: true,
        },
      },
    },
  });

  const hashtagWords = memory?.memoryHashtag.map((memoryHashtag) => memoryHashtag.hashtag.word) || [];
  console.log(hashtagWords);
  return hashtagWords;
}

export async function getHashtagIdByWord(word) {
  const id = shorthash.unique(word);
  console.log(word);
  console.log(id);

  const hashtag = await prisma.hashtag.findUnique({
    where: { id },
  });

  console.log(hashtag);

  if (!hashtag) {
    console.log("make");
    const newHashtag = await prisma.hashtag.create({
      data: {
        id,
        word,
      },
    });
  }

  console.log(id);
  return id;
}