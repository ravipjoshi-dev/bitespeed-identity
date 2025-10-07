import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const identify = async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber?.toString() || undefined }
      ],
      deletedAt: null
    }
  });

  // No match: create new
  if (contacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: { email, phoneNumber: phoneNumber?.toString(), linkPrecedence: 'primary' }
    });
    return res.status(200).json({
      contact: {
        primaryContatctId: newContact.id,
        emails: [email].filter(Boolean),
        phoneNumbers: [phoneNumber].filter(Boolean),
        secondaryContactIds: [],
      }
    });
  }

  // Existing contacts: Find root
  let primaryContacts = contacts.filter(c => c.linkPrecedence === 'primary');
  let oldestPrimary = primaryContacts.sort((a, b) => +a.createdAt - +b.createdAt)[0];

  // Update others to secondary if needed
  for (let pc of primaryContacts) {
    if (pc.id !== oldestPrimary.id) {
      await prisma.contact.update({
        where: { id: pc.id },
        data: { linkPrecedence: 'secondary', linkedId: oldestPrimary.id }
      });
    }
  }

  // Create secondary if info is new
  const emailsSet = new Set(contacts.map(c => c.email).filter(Boolean));
  const phonesSet = new Set(contacts.map(c => c.phoneNumber).filter(Boolean));
  let isAlreadyPresent = (!email || emailsSet.has(email)) && (!phoneNumber || phonesSet.has(phoneNumber));
  let newContact;
  if (!isAlreadyPresent) {
    newContact = await prisma.contact.create({
      data: { email, phoneNumber: phoneNumber?.toString(), linkedId: oldestPrimary.id, linkPrecedence: 'secondary' }
    });
    contacts.push(newContact);
  }

  // Prepare data format
  const emailsArr = [oldestPrimary.email, ...contacts.filter(x => x.id !== oldestPrimary.id).map(x => x.email)]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  const phonesArr = [oldestPrimary.phoneNumber, ...contacts.filter(x => x.id !== oldestPrimary.id).map(x => x.phoneNumber)]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  const secondaryContactIds = contacts.filter(x => x.linkPrecedence === 'secondary').map(x => x.id);

  return res.status(200).json({
    contact: {
      primaryContatctId: oldestPrimary.id,
      emails: emailsArr,
      phoneNumbers: phonesArr,
      secondaryContactIds
    }
  });
};
