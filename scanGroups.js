import * as fs from "node:fs/promises";
import * as path from "node:path";


const keepByDepthByName = {
    1: {
        "ARQUIVOS_TESTES": true,
        "scci": true,
        "sccigraf": true,
        "proglib": true,
        "extws": true,
        "docker": true,
        "Testes_Automatizados": true,
    }
};

const readGroupNamesByGroupId = async () => {
    const groupNamesByGroupId = {};
    try {
        const groupFile = await fs.readFile("/etc/group", "utf8");
        groupFile.split("\n").forEach(line => {
            if (!line) {
                return;
            }

            const parts = line.split(":");
            const name = parts[0];
            const gid = parseInt(parts[2], 10);
            groupNamesByGroupId[gid] = name;
        });

    } catch (err) {
        console.error("Erro lendo /etc/group:", err);
        process.exit(1);
    }
    return groupNamesByGroupId;
}

const root = process.argv[2] || ".";

const scanRootDir = async (rootPath) => {
    const scan = async (parentPath) => {
        try {
            const entries = await fs.readdir(parentPath, { withFileTypes: true });
            const pathsAndGroupIds = [];
            let isEmpty = true;

            for (const entry of entries) {
                if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
                    continue;
                }
                if (entry.name === "CVS" || entry.name === "CVSROOT") {
                    continue;
                }
                const name = entry.name.toString("utf8");
                const entryPath = path.join(parentPath, name);
                let entryGroupId;
                if (entry.isDirectory()) {
                    entryGroupId = await scan(entryPath);
                    if (entryGroupId === null) {
                        continue;
                    }
                } else {
                    try {
                        const stats = await fs.stat(entryPath);
                        entryGroupId = stats.gid;

                        const groupId = entryGroupId;
                        const groupName = groupNamesByGroupId[groupId];
                        groupsByPath[entryPath] = { groupId, groupName };
                    } catch (e) {
                        console.error("!", entryPath, e.code, e.message);
                        continue;
                    }
                }
                pathsAndGroupIds.push([entryPath, entryGroupId]);

                isEmpty = false;
            }
            if (isEmpty) {
                return null;
            }
            const countByGroupId = {};
            for (const pathAndGroupId of pathsAndGroupIds) {
                const [, groupId] = pathAndGroupId;
                countByGroupId[groupId] = (countByGroupId[groupId] ?? 0) + 1;
            }
            let maxGroupId = null;
            let maxCount = 0;
            for (const key in countByGroupId) {
                const groupId = Number(key);
                const count = countByGroupId[groupId];
                if (count > maxCount) {
                    maxCount = count;
                    maxGroupId = groupId;
                }
            }
            const maxGroupName = groupNamesByGroupId[maxGroupId];
            groupsByPath[parentPath] = { groupId: maxGroupId, groupName: maxGroupName };
            return maxGroupId;
        } catch (e) {
            console.error('#', parentPath, e.code, e.message);
            return null;
        }
    };

    const removeRepetition = async (parentPath, parentGroupId, parentDepth) => {
        try {
            const entryDepth = parentDepth + 1;
            const entries = await fs.readdir(parentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
                    continue;
                }
                if (entry.name === "CVS" || entry.name === "CVSROOT") {
                    continue;
                }
                const name = entry.name.toString("utf8");
                const entryPath = path.join(parentPath, name);
                const entryGroup = groupsByPath[entryPath];
                if (entryGroup !== undefined) {
                    const keep = keepByDepthByName[entryDepth]?.[name];
                    const { groupId: entryGroupId } = entryGroup;
                    if (entryGroupId === parentGroupId && !keep) {
                        groupsByPath[entryPath] = undefined;
                    }
                    if (entry.isDirectory()) {
                        await removeRepetition(entryPath, entryGroupId, entryDepth);
                    }
                }
            }
        } catch (e) {
            console.error('@', parentPath, e.code, e.message);
        }
    };

    const groupNamesByGroupId = await readGroupNamesByGroupId();

    const groupsByPath = {};

    const rootGroupId = await scan(rootPath);
    await removeRepetition(rootPath, rootGroupId, 0);

    return groupsByPath;
}

const groupsByPath = await scanRootDir(root);

console.log(JSON.stringify(groupsByPath, null, 2));
