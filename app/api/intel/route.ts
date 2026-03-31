import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        const searchTerm = query || 'Technology';

        // Fetch from Google News RSS
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}+when:1d&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(rssUrl);
        const xmlData = await response.text();

        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlData);

        const items = jsonObj?.rss?.channel?.item || [];

        // Map to our format
        // Take top 10 items
        const newsItems = items.slice(0, 10).map((item: any) => {
            // Extract source from title if possible "Title - Source"
            let source = "News";
            let title = item.title;
            const sourceMatch = item.title.match(/(.*) - (.*)$/);
            if (sourceMatch) {
                title = sourceMatch[1];
                source = sourceMatch[2];
            }

            return {
                title: title,
                source: source,
                time: new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                link: item.link,
                impact: calculateImpact(title), // Simulated impact analysis
                type: categorizeNews(title)
            };
        });

        return NextResponse.json({ items: newsItems });

    } catch (error) {
        console.error('Intel Feed Error:', error);
        return NextResponse.json({ items: [] }, { status: 500 });
    }
}

function calculateImpact(title: string): 'Critical' | 'High' | 'Medium' | 'Low' {
    const criticalKeywords = ['funding', 'acquisition', 'lawsuit', 'regulations', 'breach', 'security', 'collapse'];
    const highKeywords = ['launch', 'partnership', 'growth', 'revenue', 'record', 'new feature'];
    const mediumKeywords = ['update', 'release', 'hire', 'change'];

    const lowerTitle = title.toLowerCase();

    if (criticalKeywords.some(k => lowerTitle.includes(k))) return 'Critical';
    if (highKeywords.some(k => lowerTitle.includes(k))) return 'High';
    if (mediumKeywords.some(k => lowerTitle.includes(k))) return 'Medium';
    return 'Low';
}

function categorizeNews(title: string): 'funding' | 'legal' | 'market' | 'tech' | 'general' {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('funding') || lowerTitle.includes('raised') || lowerTitle.includes('capital')) return 'funding';
    if (lowerTitle.includes('law') || lowerTitle.includes('court') || lowerTitle.includes('policy')) return 'legal';
    if (lowerTitle.includes('market') || lowerTitle.includes('stock') || lowerTitle.includes('trade')) return 'market';
    if (lowerTitle.includes('ai') || lowerTitle.includes('tech') || lowerTitle.includes('software')) return 'tech';
    return 'general';
}
