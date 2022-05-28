import {MigrationInterface, QueryRunner} from "typeorm";

export class refresh1653416486865 implements MigrationInterface {
    name = 'refresh1653416486865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`createAt\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`updateAt\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`refresh_token\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`update_at\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`create_at\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` DROP COLUMN \`refresh_token\``);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`updateAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`usuarios\` ADD \`createAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

}
