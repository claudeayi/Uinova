import prisma from "../utils/prisma";
import { Request, Response } from "express";

export const saveExport = async (req: Request, res: Response) => {
  const exportObj = await prisma.export.create({
    data: {
      type: req.body.type,
      content: req.body.content,
      projectId: +req.params.projectId,
      pageId: +req.params.pageId,
    }
  });
  res.status(201).json(exportObj);
};

export const list = async (req: Request, res: Response) => {
  const exports = await prisma.export.findMany({ where: { pageId: +req.params.pageId } });
  res.json(exports);
};
