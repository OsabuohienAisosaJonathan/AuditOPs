
import mysql from "mysql2/promise";

const dbUrl = "mysql://root:@localhost:3306/auditops_db";

async function reset() {
    console.log("Connecting to", dbUrl);
    const connection = await mysql.createConnection(dbUrl);

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    const [rows] = await connection.query("SHOW TABLES");
    const tables = (rows as any[]).map(r => Object.values(r)[0]);

    if (tables.length === 0) {
        console.log("No tables found.");
    } else {
        console.log(`Found ${tables.length} tables. Dropping...`);
        for (const table of tables) {
            await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
            console.log(`Dropped ${table}`);
        }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Database cleared.");
    await connection.end();
}

reset().catch(e => {
    console.error(e);
    process.exit(1);
});
