import { Prisma } from '@prisma/client';

function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (e) {
      if (
        e.name === 'StructError' ||
        e instanceof Prisma.PrismaClientValidationError
      ) {
        res.status(400).send({ message: "잘못된 요청입니다(StructError)" });
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        res.sendStatus(404)({ message: "존재하지 않습니다"});
      } else {
        res.status(500).send({ message: e.message });
      }
    }
  };
}

export default asyncHandler;