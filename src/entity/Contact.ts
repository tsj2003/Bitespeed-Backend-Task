import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, DeleteDateColumn
} from "typeorm";

@Entity()
export class Contact {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", nullable: true })
    phoneNumber: string | null;

    @Column({ type: "varchar", nullable: true })
    email: string | null;

    // points to the id of another Contact if this is a secondary
    @Column({ type: "int", nullable: true })
    linkedId: number | null;

    @Column({ type: "varchar", default: "primary" })
    linkPrecedence: "primary" | "secondary";

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;
}
