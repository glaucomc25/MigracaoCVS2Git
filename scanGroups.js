const fs = require("node:fs/promises");
const path = require("node:path");

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

const scanRootDir = async (rootDir) => {
    const scan = async (parentPath) => {
        try {
            const entries = await fs.readdir(parentPath, { withFileTypes: true });
            let groupId = null;
            let isEmpty = true;
            let saveEntries = false;
            let pathsAndGroupIds = [];

            for (const entry of entries) {
                if (entry.name === "CVS" || entry.name === "CVSROOT") {
                    continue;
                }
                const name = entry.name;
                const fullPath = path.join(parentPath, name);
                if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
                    continue;
                }

                let entryGroupId;
                if (entry.isDirectory()) {
                    entryGroupId = scan(fullPath);
                } else {
                    try {
                        const stats = fs.statSync(fullPath);
                        entryGroupId = stats.gid;
                    } catch (e) {
                        console.error("!", fullPath, e.code);
                        continue;
                    }
                }
                if (entryGroupId === null) {
                    continue;
                }

                pathsAndGroupIds.push([fullPath, entryGroupId]);
                isEmpty = false;
                if (groupId === null) {
                    groupId = entryGroupId;
                }

                if (groupId !== null && groupId !== entryGroupId) {
                    saveEntries = true;
                }
            }
            if (isEmpty) {
                return null;
            }
            if (saveEntries) {
                const countByGroupId = {};
                for (const fullPathAndGroupId of pathsAndGroupIds) {
                    const [, groupId] = fullPathAndGroupId;
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
                for (const pathAndGroupId of pathsAndGroupIds) {
                    const [path, groupId] = pathAndGroupId;
                    const groupName = groupNamesByGroupId[groupId];
                    groupsByPath[path] = { groupId, groupName };
                }
                return maxGroupId;
            }

            return groupId;
        } catch (e) {
            console.error('#', parentPath, e.code);
            return null;
        }
    };

    const removeRepetition = async (parentPath, parentGroupId) => {
        try {
            const entries = await fs.readdir(parentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === "CVS" || entry.name === "CVSROOT") {
                    continue;
                }
                const name = entry.name;
                const entryPath = path.join(parentPath, name);
                const entryGroup = groupsByPath[entryPath];
                const { groupId: entryGroupId } = entryGroup;
                if (entryGroupId === parentGroupId) {
                    groupsByPath[entryPath] = undefined;
                }
                await removeRepetition(entryPath, entryGroupId);
            }
        } catch (e) {
            console.error('#', parentPath, e.code);
        }
    };

    const groupNamesByGroupId = await readGroupNamesByGroupId();

    const groupsByPath = {};

    const rootGroupId = scan(rootDir);
    if (rootGroupId !== null) {
        const groupName = groupNamesByGroupId[rootGroupId];
        groupsByPath[rootDir] = { groupId, groupName };
    }
    removeRepetition(rootDir, rootGroupId);

    return groupsByPath;
}

const groupsByPath = scanRootDir(root);

console.log(JSON.stringify(groupsByPath, null, 2));
