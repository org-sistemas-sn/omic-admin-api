import {MigrationInterface, QueryRunner} from "typeorm";

export class empresas1653583483129 implements MigrationInterface {
    name = 'empresas1653583483129'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`contactos\` DROP FOREIGN KEY \`FK_e857c0ad15cceb39779158cd8c7\``);
        await queryRunner.query(`ALTER TABLE \`contactos\` CHANGE \`empresaId\` \`empresa_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`contactos\` ADD CONSTRAINT \`FK_3ca923c9a0f1cf8f743b34d1b8c\` FOREIGN KEY (\`empresa_id\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`contactos\` DROP FOREIGN KEY \`FK_3ca923c9a0f1cf8f743b34d1b8c\``);
        await queryRunner.query(`ALTER TABLE \`contactos\` CHANGE \`empresa_id\` \`empresaId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`contactos\` ADD CONSTRAINT \`FK_e857c0ad15cceb39779158cd8c7\` FOREIGN KEY (\`empresaId\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
