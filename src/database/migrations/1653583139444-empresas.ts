import { MigrationInterface, QueryRunner } from 'typeorm';

export class empresas1653583139444 implements MigrationInterface {
  name = 'empresas1653583139444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`empresas\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`cuit\` varchar(255) NULL, \`email\` varchar(255) NULL, \`domicilio\` varchar(255) NULL, \`estado\` enum ('Adherido', 'No_Adherido') NOT NULL DEFAULT 'Adherido', \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fe5e0374ec6d7d7dfbe0444690\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`contactos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`caracter\` varchar(255) NULL, \`telefono\` varchar(255) NULL, \`email\` varchar(255) NOT NULL, \`domicilioReal\` varchar(255) NULL, \`domicilioConstituido\` varchar(255) NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`empresaId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`contactos\` ADD CONSTRAINT \`FK_e857c0ad15cceb39779158cd8c7\` FOREIGN KEY (\`empresaId\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`contactos\` DROP FOREIGN KEY \`FK_e857c0ad15cceb39779158cd8c7\``,
    );
    await queryRunner.query(`DROP TABLE \`contactos\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fe5e0374ec6d7d7dfbe0444690\` ON \`empresas\``,
    );
    await queryRunner.query(`DROP TABLE \`empresas\``);
  }
}
