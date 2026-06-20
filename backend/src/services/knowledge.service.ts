import * as faqRepository from '../repositories/faq.repository';

export function getKnowledgeBasePrompt(): string {
  const faqs = faqRepository.findAll();

  if (faqs.length === 0) {
    return 'STORE KNOWLEDGE:\n\nNo FAQ entries are currently available.';
  }

  const byTopic = new Map<string, typeof faqs>();
  for (const faq of faqs) {
    const group = byTopic.get(faq.topic) ?? [];
    group.push(faq);
    byTopic.set(faq.topic, group);
  }

  const sections = [...byTopic.entries()]
    .map(([topic, entries]) => {
      const heading = `## ${topic.toUpperCase()}`;
      const qas = entries.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      return `${heading}\n${qas}`;
    })
    .join('\n\n');

  return `STORE KNOWLEDGE:\n\n${sections}`;
}
