const fs = require("fs");
const path = require("path");

const groupNamesByGroupId = {};
try {
    const groupFile = fs.readFileSync("/etc/group", "utf8");

    groupFile.split("\n").forEach(line => {
        if (!line) return;

        const parts = line.split(":");                // cria algo como:
        const name = parts[0];                        //   {
        const gid = parseInt(parts[2], 10);           //        0: "root",
        //        27: "sudo", 
        groupNamesByGroupId[gid] = name;                         //        1000: "glauco"
    });                                               //   }

} catch (err) {
    console.error("Erro lendo /etc/group:", err);
}

const root = process.argv[2] || ".";
const groupNamesByPath = {};

function scanDirectory(dir) {

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let groupId = null;
    let isEmpty = true;
    let saveEntries = false;
    let fullPathsAndGroupIds = [];  //path de arquivos e paths de diretorios que scanDirectory retornou != -1 e != null

    for (const entry of entries) {

        const fullPath = path.join(dir, entry.name);
        if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile()) || entry.name === "CVS" || entry.name === "CVSROOT") {
            continue;
        }

        let entryGroupId;
        if (entry.isDirectory()) {
            entryGroupId = scanDirectory(fullPath);
        } else {
            const stats = fs.statSync(fullPath);
            entryGroupId = stats.gid;
        }
        if (entryGroupId === null) {
            continue;
        }
        if (entryGroupId !== -1 ) {
            fullPathsAndGroupIds.push([fullPath, entryGroupId]);
            isEmpty = false;
        }
        if (groupId === null && entryGroupId !== -1 ) {
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
        for ( const fullPathAndGroupId of fullPathsAndGroupIds ) {
            const [fullPath, groupId] = fullPathAndGroupId;
            groupNamesByPath[fullPath] =  groupNamesByGroupId[groupId];
        }
        return -1;
    }

    return groupId;
}

const groupId = scanDirectory(root);
if (groupId !== null && groupId !== -1) {
    groupNamesByPath[root] =  groupNamesByGroupId[groupId];
}

console.log(JSON.stringify(groupNamesByPath, null, 2));