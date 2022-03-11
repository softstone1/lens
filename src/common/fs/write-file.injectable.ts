/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { EnsureOptions, WriteOptions } from "fs-extra";
import path from "path";
import fsInjectable from "./fs.injectable";

export type WriteFile = (filePath: string, data: string | Buffer) => Promise<void>;

interface Dependencies {
  writeFile: (file: string, data: string | Buffer, options?: WriteOptions | BufferEncoding | string) => Promise<void>;
  ensureDir: (dir: string, options?: EnsureOptions | number) => Promise<void>;
}

const writeFile = ({ writeFile, ensureDir }: Dependencies): WriteFile => (
  async (filePath, data) => {
    await ensureDir(path.dirname(filePath), { mode: 0o755 });

    await writeFile(filePath, data, {
      encoding: "utf-8",
    });
  }
);

const writeFileInjectable = getInjectable({
  instantiate: (di) => writeFile(di.inject(fsInjectable)),
  id: "write-file",
});

export default writeFileInjectable;
