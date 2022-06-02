import { MigrationInterface, QueryRunner } from 'typeorm';

export class fojas1654186208492 implements MigrationInterface {
  name = 'fojas1654186208492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`contactos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`caracter\` varchar(255) NULL, \`telefono\` varchar(255) NULL, \`email\` varchar(255) NOT NULL, \`domicilioReal\` varchar(255) NULL, \`domicilioConstituido\` varchar(255) NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`empresa_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`empresas\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`cuit\` varchar(255) NULL, \`email\` varchar(255) NULL, \`domicilio\` varchar(255) NULL, \`estado\` enum ('ADHERIDO', 'NO_ADHERIDO') NOT NULL DEFAULT 'ADHERIDO', \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fe5e0374ec6d7d7dfbe0444690\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`archivos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`descripcion\` varchar(255) NOT NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`foja_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`fojas\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ruta\` varchar(255) NOT NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`autorizados\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`apellido\` varchar(255) NOT NULL, \`dni\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`telefono\` varchar(255) NOT NULL, \`domicilio\` varchar(255) NOT NULL, \`localidad\` varchar(255) NOT NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`denunciantes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`apellido\` varchar(255) NOT NULL, \`dni_cuil\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`telefono\` varchar(255) NULL, \`telefono_alter\` varchar(255) NULL, \`celular\` varchar(255) NOT NULL, \`domicilio\` varchar(255) NOT NULL, \`localidad\` varchar(255) NOT NULL, \`cod_postal\` varchar(255) NOT NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`autorizado_id\` int NULL, UNIQUE INDEX \`REL_6e16981d9d4ab247c6c3e1e1bf\` (\`autorizado_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`estados\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`denuncias\` (\`id\` int NOT NULL AUTO_INCREMENT, \`descripcion_hechos\` text NOT NULL, \`pretension\` text NOT NULL, \`manera_contrato\` varchar(255) NOT NULL, \`servicio_denunciado\` varchar(255) NOT NULL, \`realizo_reclamo\` varchar(255) NOT NULL, \`observaciones\` text NULL, \`estado_general\` enum ('ABIERTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO', \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`estado_id\` int NULL, \`denunciante_id\` int NULL, \`foja_id\` int NULL, UNIQUE INDEX \`REL_d2b981ae68b9203fcebca23868\` (\`denunciante_id\`), UNIQUE INDEX \`REL_07fdaf19cef26b291f04bc4f97\` (\`foja_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`denunciados\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`dni_cuil_cuit\` varchar(255) NULL, \`email\` varchar(255) NULL, \`telefono\` varchar(255) NULL, \`telefono_alter\` varchar(255) NULL, \`domicilio\` varchar(255) NULL, \`localidad\` varchar(255) NULL, \`cod_postal\` varchar(255) NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`denuncia_id\` int NULL, \`empresa_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`usuarios\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`apellido\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`refresh_token\` varchar(255) NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`update_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_446adfc18b35418aac32ae0b7b\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`contactos\` ADD CONSTRAINT \`FK_3ca923c9a0f1cf8f743b34d1b8c\` FOREIGN KEY (\`empresa_id\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`archivos\` ADD CONSTRAINT \`FK_4b1ce6e096246cf7b87ebaeaaae\` FOREIGN KEY (\`foja_id\`) REFERENCES \`fojas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denunciantes\` ADD CONSTRAINT \`FK_6e16981d9d4ab247c6c3e1e1bfa\` FOREIGN KEY (\`autorizado_id\`) REFERENCES \`autorizados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` ADD CONSTRAINT \`FK_6628576912b3d0621c6f388fd47\` FOREIGN KEY (\`estado_id\`) REFERENCES \`estados\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` ADD CONSTRAINT \`FK_d2b981ae68b9203fcebca238683\` FOREIGN KEY (\`denunciante_id\`) REFERENCES \`denunciantes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` ADD CONSTRAINT \`FK_07fdaf19cef26b291f04bc4f978\` FOREIGN KEY (\`foja_id\`) REFERENCES \`fojas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denunciados\` ADD CONSTRAINT \`FK_ad1f5ececc5a2630cf88e301ea1\` FOREIGN KEY (\`denuncia_id\`) REFERENCES \`denuncias\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`denunciados\` ADD CONSTRAINT \`FK_01ba26659c78a6064ce2ca70d6d\` FOREIGN KEY (\`empresa_id\`) REFERENCES \`empresas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`denunciados\` DROP FOREIGN KEY \`FK_01ba26659c78a6064ce2ca70d6d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denunciados\` DROP FOREIGN KEY \`FK_ad1f5ececc5a2630cf88e301ea1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` DROP FOREIGN KEY \`FK_07fdaf19cef26b291f04bc4f978\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` DROP FOREIGN KEY \`FK_d2b981ae68b9203fcebca238683\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denuncias\` DROP FOREIGN KEY \`FK_6628576912b3d0621c6f388fd47\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`denunciantes\` DROP FOREIGN KEY \`FK_6e16981d9d4ab247c6c3e1e1bfa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`archivos\` DROP FOREIGN KEY \`FK_4b1ce6e096246cf7b87ebaeaaae\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`contactos\` DROP FOREIGN KEY \`FK_3ca923c9a0f1cf8f743b34d1b8c\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_446adfc18b35418aac32ae0b7b\` ON \`usuarios\``,
    );
    await queryRunner.query(`DROP TABLE \`usuarios\``);
    await queryRunner.query(`DROP TABLE \`denunciados\``);
    await queryRunner.query(
      `DROP INDEX \`REL_07fdaf19cef26b291f04bc4f97\` ON \`denuncias\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d2b981ae68b9203fcebca23868\` ON \`denuncias\``,
    );
    await queryRunner.query(`DROP TABLE \`denuncias\``);
    await queryRunner.query(`DROP TABLE \`estados\``);
    await queryRunner.query(
      `DROP INDEX \`REL_6e16981d9d4ab247c6c3e1e1bf\` ON \`denunciantes\``,
    );
    await queryRunner.query(`DROP TABLE \`denunciantes\``);
    await queryRunner.query(`DROP TABLE \`autorizados\``);
    await queryRunner.query(`DROP TABLE \`fojas\``);
    await queryRunner.query(`DROP TABLE \`archivos\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fe5e0374ec6d7d7dfbe0444690\` ON \`empresas\``,
    );
    await queryRunner.query(`DROP TABLE \`empresas\``);
    await queryRunner.query(`DROP TABLE \`contactos\``);
  }
}
