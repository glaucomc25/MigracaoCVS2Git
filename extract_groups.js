const fs = require("fs");
const path = require("path");

const ROOT = "/repos/cvs";
const OUTPUT = "files-groupid.json";

const IGNORE_DIRS = new Set([
    "CVSROOT",
    "CVS",
    ".git",
    "node_modules",
    "target",
    "build"
]);

const result = [];

function scan(dir) {

    let entries;

    try {
        entries = fs.readdirSync(dir, {
            withFileTypes: true,
            encoding: "buffer"
        });
        entries.sort((a, b) =>
            a.name.toString("utf-8").localeCompare(b.name.toString("utf-8"), "pt-BR")
        );
    } catch (err) {
        console.error("Erro lendo diretório:", dir, err.message);
        return;
    }

    for (const entry of entries) {

        const name = entry.name.toString("utf8"); //converte o buffer em string
        const fullPath = path.join(dir, name);

        if (entry.isDirectory()) {

            if (IGNORE_DIRS.has(name)) continue;

            scan(fullPath);

        } else {

            try {
                console.log("PATH:", fullPath);
                const stat = fs.statSync(fullPath);

                const relPath = path.relative(ROOT, fullPath);

                result.push({
                    path: relPath,
                    groupId: stat.gid
                });

            } catch (err) {
                console.error("Erro stat:", fullPath);
            }
        }
    }
}

console.log("Escaneando:", ROOT);

scan(ROOT);

fs.writeFileSync(
    OUTPUT,
    JSON.stringify(result, null, 2),
    { encoding: "utf8" }
);

console.log("Arquivos processados:", result.length);
console.log("JSON salvo em:", OUTPUT);