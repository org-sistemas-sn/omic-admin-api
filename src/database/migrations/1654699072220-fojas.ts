import { MigrationInterface, QueryRunner } from 'typeorm';

export class fojas1654699072220 implements MigrationInterface {
  name = 'fojas1654699072220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` DROP FOREIGN KEY \`FK_07fdaf19cef26b291f04bc4f978\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_07fdaf19cef26b291f04bc4f97\` ON \`denuncias\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` DROP COLUMN \`foja_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fojas\` ADD \`denuncia_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fojas\` ADD UNIQUE INDEX \`IDX_00d1cf2dc811e70ccdb261f397\` (\`denuncia_id\`)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_00d1cf2dc811e70ccdb261f397\` ON \`fojas\` (\`denuncia_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fojas\` ADD CONSTRAINT \`FK_00d1cf2dc811e70ccdb261f3979\` FOREIGN KEY (\`denuncia_id\`) REFERENCES \`denuncias\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fojas\` DROP FOREIGN KEY \`FK_00d1cf2dc811e70ccdb261f3979\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_00d1cf2dc811e70ccdb261f397\` ON \`fojas\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fojas\` DROP INDEX \`IDX_00d1cf2dc811e70ccdb261f397\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fojas\` DROP COLUMN \`denuncia_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` ADD \`foja_id\` int NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_07fdaf19cef26b291f04bc4f97\` ON \`denuncias\` (\`foja_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` ADD CONSTRAINT \`FK_07fdaf19cef26b291f04bc4f978\` FOREIGN KEY (\`foja_id\`) REFERENCES \`fojas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
