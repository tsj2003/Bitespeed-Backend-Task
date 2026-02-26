import { AppDataSource } from "../config/database";
import { Contact } from "../entity/Contact";

const contactRepo = () => AppDataSource.getRepository(Contact);

// walks up the chain to find the root primary for any contact
async function findPrimaryContact(contact: Contact): Promise<Contact> {
    let current = contact;
    while (current.linkedId !== null) {
        const parent = await contactRepo().findOneBy({ id: current.linkedId });
        if (!parent) break;
        current = parent;
    }
    return current;
}

// gets the primary + all its secondary contacts in order
async function getAllLinkedContacts(primaryId: number): Promise<Contact[]> {
    const primary = await contactRepo().findOneBy({ id: primaryId });
    const secondaries = await contactRepo().find({
        where: { linkedId: primaryId },
        order: { createdAt: "ASC" },
    });

    if (!primary) return secondaries;
    return [primary, ...secondaries];
}

// puts together the response json
function buildResponse(primary: Contact, allContacts: Contact[]) {
    const emails: string[] = [];
    const phones: string[] = [];
    const secondaryIds: number[] = [];

    // primary's info goes first in the arrays
    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phones.push(primary.phoneNumber);

    for (const c of allContacts) {
        if (c.id === primary.id) continue;

        if (c.email && !emails.includes(c.email)) emails.push(c.email);
        if (c.phoneNumber && !phones.includes(c.phoneNumber)) phones.push(c.phoneNumber);
        secondaryIds.push(c.id);
    }

    return {
        contact: {
            primaryContatctId: primary.id,
            emails,
            phoneNumbers: phones,
            secondaryContactIds: secondaryIds,
        },
    };
}

export async function identifyContact(email: string | null, phoneNumber: string | null) {
    const repo = contactRepo();

    // grab all contacts matching the given email or phone
    const matches: Contact[] = [];

    if (email) {
        const byEmail = await repo.find({ where: { email } });
        matches.push(...byEmail);
    }

    if (phoneNumber) {
        const byPhone = await repo.find({ where: { phoneNumber } });
        for (const c of byPhone) {
            if (!matches.some(m => m.id === c.id)) {
                matches.push(c);
            }
        }
    }

    // nothing found? create a fresh primary
    if (matches.length === 0) {
        const fresh = repo.create({ email, phoneNumber, linkPrecedence: "primary" });
        const saved = await repo.save(fresh);
        return buildResponse(saved, [saved]);
    }

    // figure out which primary each match belongs to
    const primaries: Contact[] = [];
    for (const m of matches) {
        const p = await findPrimaryContact(m);
        if (!primaries.some(x => x.id === p.id)) {
            primaries.push(p);
        }
    }

    // oldest primary wins if there are multiple
    primaries.sort((a, b) => {
        const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
        return timeDiff !== 0 ? timeDiff : a.id - b.id;
    });
    const mainPrimary = primaries[0];

    // if we have two separate primaries, we need to merge them
    if (primaries.length > 1) {
        for (let i = 1; i < primaries.length; i++) {
            const other = primaries[i];

            // demote it
            other.linkPrecedence = "secondary";
            other.linkedId = mainPrimary.id;
            await repo.save(other);

            // move its children over too
            const itsChildren = await repo.find({ where: { linkedId: other.id } });
            for (const child of itsChildren) {
                child.linkedId = mainPrimary.id;
                await repo.save(child);
            }
        }
    }

    // check the full cluster now
    const cluster = await getAllLinkedContacts(mainPrimary.id);

    // see if the request has any info we don't already have
    const knownEmails = cluster.map(c => c.email).filter(Boolean) as string[];
    const knownPhones = cluster.map(c => c.phoneNumber).filter(Boolean) as string[];

    const hasNewEmail = email && !knownEmails.includes(email);
    const hasNewPhone = phoneNumber && !knownPhones.includes(phoneNumber);

    if (hasNewEmail || hasNewPhone) {
        // make sure we don't create a duplicate row
        const duplicate = cluster.some(c => c.email === email && c.phoneNumber === phoneNumber);

        if (!duplicate) {
            const secondary = repo.create({
                email,
                phoneNumber,
                linkedId: mainPrimary.id,
                linkPrecedence: "secondary",
            });
            await repo.save(secondary);

            const updated = await getAllLinkedContacts(mainPrimary.id);
            return buildResponse(mainPrimary, updated);
        }
    }

    return buildResponse(mainPrimary, cluster);
}
