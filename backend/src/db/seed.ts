import { v4 as uuidv4 } from 'uuid';
import { getDb } from './client';
import { runMigrations } from './migrate';

const faqs = [
  // Shipping
  {
    topic: 'shipping',
    question: 'What shipping options do you offer?',
    answer:
      'We offer three domestic shipping options: Standard (5–7 business days, free on orders over $50), Express (2–3 business days, $9.99), and Overnight (next business day, $19.99). You can choose your preferred option at checkout.',
  },
  {
    topic: 'shipping',
    question: 'Do you ship internationally?',
    answer:
      'Yes! We ship to most countries worldwide. International orders typically arrive within 10–21 business days depending on your location and local customs processing. International shipping rates are calculated at checkout based on destination and package weight. Please note that any customs duties or import taxes are the responsibility of the recipient.',
  },
  {
    topic: 'shipping',
    question: 'How do I track my order?',
    answer:
      'Once your order ships, you\'ll receive a confirmation email with a tracking number. You can use that number on our website under "My Orders" or paste it directly into the carrier\'s tracking page. Tracking updates usually appear within 24 hours of your order leaving our warehouse.',
  },

  // Orders
  {
    topic: 'orders',
    question: 'Can I cancel or change my order after placing it?',
    answer:
      'You have a 1-hour window after placing your order to cancel or make changes — just contact us right away via live chat or email. After that window, your order enters our fulfillment queue and we can\'t guarantee changes. If the order has already shipped, you\'re welcome to return it once it arrives.',
  },
  {
    topic: 'orders',
    question: 'My order arrived damaged or I received the wrong item — what do I do?',
    answer:
      'We\'re sorry about that! Please contact us within 7 days of delivery with your order number and a photo of the issue. We\'ll send a replacement or issue a full refund right away — no need to ship anything back for damaged or incorrect items.',
  },

  // Returns
  {
    topic: 'returns',
    question: 'What is your return policy?',
    answer:
      'We accept returns within 30 days of delivery. Items must be unused, in their original packaging, and in the same condition you received them. Sale items and gift cards are final sale and cannot be returned. To start a return, visit "My Orders" on our website or contact our support team.',
  },
  {
    topic: 'returns',
    question: 'How long does it take to receive my refund?',
    answer:
      'Once we receive and inspect your return (usually 2–3 business days after it arrives at our warehouse), we\'ll email you to confirm. Refunds are issued to your original payment method within 5–7 business days after approval. If you paid by credit card, your bank may take an additional 1–2 billing cycles to post the credit.',
  },
  {
    topic: 'returns',
    question: 'Can I exchange an item instead of returning it?',
    answer:
      'Absolutely. If you\'d like a different size, color, or item, just let us know when you initiate your return and we\'ll set up an exchange. Exchanges ship free of charge. If the replacement item is a different price, we\'ll charge or refund the difference automatically.',
  },

  // Payments
  {
    topic: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, and Google Pay. All transactions are processed securely — we never store your full card details on our servers.',
  },
  {
    topic: 'payments',
    question: 'Is it safe to enter my payment information on your site?',
    answer:
      'Yes, completely. Our checkout uses 256-bit SSL encryption, and payments are processed by Stripe, a PCI-DSS Level 1 certified provider. You\'ll see the padlock icon in your browser\'s address bar confirming the secure connection.',
  },

  // Support
  {
    topic: 'support',
    question: 'What are your customer support hours?',
    answer:
      'Our support team is available Monday through Friday, 9 AM – 6 PM Eastern Time. We\'re closed on major US holidays. You can reach us anytime via this chat widget and we\'ll respond to any messages left outside business hours first thing the next business day.',
  },
  {
    topic: 'support',
    question: 'How do I reach a human agent?',
    answer:
      'Just type "talk to a person" or "human agent" in this chat at any time and you\'ll be connected to a member of our support team during business hours (Mon–Fri, 9 AM–6 PM ET). You can also email us at support@examplestore.com or call 1-800-555-0100. We aim to respond to all emails within one business day.',
  },
];

function seed(): void {
  runMigrations();

  const db = getDb();

  db.transaction(() => {
    db.prepare('DELETE FROM faqs').run();

    const insert = db.prepare(
      `INSERT INTO faqs (id, topic, question, answer) VALUES (?, ?, ?, ?)`
    );

    for (const faq of faqs) {
      insert.run(uuidv4(), faq.topic, faq.question, faq.answer);
    }
  })();

  console.log(`[seed] Seeded ${faqs.length} FAQs.`);
}

seed();
