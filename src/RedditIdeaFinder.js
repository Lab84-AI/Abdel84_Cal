import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { Download, ExternalLink, RefreshCcw, Search } from 'lucide-react';

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'from', 'have', 'into', 'just', 'like', 'need', 'other', 'that', 'they',
  'this', 'what', 'when', 'where', 'which', 'would', 'there', 'their', 'with', 'your', 'such', 'some', 'more',
  'than', 'then', 'them', 'will', 'could', 'should', 'because', 'being', 'while', 'doing', 'make', 'know',
  'want', 'looking', 'does', 'anyone', 'something', 'someone', 'idea', 'ideas', 'apps', 'app', 'building',
]);

const CATEGORY_TAGS = [
  { label: 'Health & Fitness', keywords: ['fitness', 'health', 'sleep', 'diet', 'workout', 'exercise'] },
  { label: 'Productivity & Focus', keywords: ['productivity', 'focus', 'task', 'schedule', 'planner', 'habit', 'routine'] },
  { label: 'Finance & Budgeting', keywords: ['finance', 'budget', 'expense', 'money', 'invest', 'trading', 'crypto'] },
  { label: 'Learning & Coaching', keywords: ['study', 'learn', 'language', 'coach', 'education', 'training'] },
  { label: 'Wellness & Support', keywords: ['mental', 'therapy', 'stress', 'mindfulness', 'anxiety', 'community'] },
  { label: 'Lifestyle Tracking', keywords: ['tracking', 'track', 'monitor', 'log', 'journal', 'habit'] },
];

const INTENT_SIGNALS = [
  'build an app',
  'build me an app',
  'develop an app',
  'need an app',
  'custom app',
  'looking for an app',
  'recommend an app',
  'app idea',
  'app ideas',
  'software to',
  'tool to',
  'is there an app',
];

const DEFAULT_KEYWORDS = '"need an app" OR "app idea" OR "build an app"';
const DEFAULT_SUBREDDITS = 'entrepreneur, startups, saas, sideproject, productivity';

const timeRanges = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'year', label: '12 months' },
  { value: 'all', label: 'All time' },
];

function parseSubreddits(input) {
  return input
    .split(',')
    .map((item) => item.trim().replace(/^r\//i, ''))
    .filter(Boolean);
}

function extractKeywords(input) {
  return input
    .split(/[,/]| OR | AND |\n/g)
    .map((item) => item.replace(/["()]/g, '').trim())
    .filter(Boolean)
    .flatMap((phrase) => phrase.toLowerCase().split(/\s+/g))
    .filter((word) => word.length > 2);
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffMinutes = Math.round(diffMs / 1000 / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 60) {
    return `${diffDays}d ago`;
  }
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 24) {
    return `${diffMonths}mo ago`;
  }
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
}

function calculateOpportunityScore(post, keywordTokens) {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  let score = 0;

  const uniqueMatches = new Set();
  keywordTokens.forEach((token) => {
    if (token && text.includes(token)) {
      uniqueMatches.add(token);
    }
  });
  score += uniqueMatches.size * 4;

  INTENT_SIGNALS.forEach((signal) => {
    if (text.includes(signal)) {
      score += 5;
    }
  });

  if (post.title.includes('?')) {
    score += 3;
  }
  if (text.includes('any ideas') || text.includes('any recommendations')) {
    score += 2;
  }

  score += Math.min(post.score, 80) / 6;
  score += Math.min(post.num_comments, 60) / 6;
  score += (post.upvote_ratio || 0.5) * 4;

  if (text.includes('need') || text.includes('looking for')) {
    score += 2;
  }

  return Math.round(score * 10) / 10;
}

function deriveTags(post) {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  const tags = new Set();

  CATEGORY_TAGS.forEach((category) => {
    if (category.keywords.some((keyword) => text.includes(keyword))) {
      tags.add(category.label);
    }
  });

  if (post.score >= 20 && post.num_comments >= 5) {
    tags.add('High Engagement');
  }
  if (post.selftext.length > 280) {
    tags.add('Detailed Pain Point');
  }
  if (post.score <= 5 && post.upvote_ratio < 0.7) {
    tags.add('Controversial');
  }

  return Array.from(tags);
}

function computeInsights(posts) {
  if (!posts.length) {
    return null;
  }

  const subredditCounts = new Map();
  const keywordCounts = new Map();
  const categoryCounts = new Map();

  posts.forEach((post) => {
    subredditCounts.set(post.subreddit, (subredditCounts.get(post.subreddit) || 0) + 1);

    deriveTags(post).forEach((tag) => {
      if (!tag.includes('&')) {
        categoryCounts.set(tag, (categoryCounts.get(tag) || 0) + 1);
      }
    });

    const tokens = `${post.title} ${post.selftext}`
      .toLowerCase()
      .match(/[a-z]{4,}/g);

    (tokens || []).forEach((token) => {
      if (!STOP_WORDS.has(token)) {
        keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
      }
    });
  });

  const topSubreddits = Array.from(subredditCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  const averageScore = posts.reduce((sum, post) => sum + (post.opportunityScore || 0), 0) / posts.length;

  return {
    totalPosts: posts.length,
    averageScore: Math.round(averageScore * 10) / 10,
    topSubreddits,
    topKeywords,
    topCategories,
  };
}

function downloadCsv(posts) {
  if (!posts.length) {
    return;
  }

  const headers = [
    'Title',
    'Subreddit',
    'Score',
    'Comments',
    'OpportunityScore',
    'Posted',
    'Tags',
    'URL',
  ];

  const rows = posts.map((post) => [
    post.title.replace(/"/g, '""'),
    post.subreddit,
    post.score,
    post.num_comments,
    post.opportunityScore,
    new Date(post.created_utc * 1000).toISOString(),
    deriveTags(post).join('; '),
    `https://reddit.com${post.permalink}`,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${value}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'reddit_app_opportunities.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function OpportunityCard({ post }) {
  const tags = deriveTags(post);
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" component="span">
              {post.title}
            </Typography>
            <Chip size="small" label={`r/${post.subreddit}`} color="primary" />
          </Stack>
        }
        subheader={`Score: ${post.score} · Comments: ${post.num_comments} · ${formatRelativeTime(post.created_utc)}`}
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {post.selftext ? `${post.selftext.slice(0, 220)}${post.selftext.length > 220 ? '…' : ''}` : 'No additional context provided.'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`Opportunity Score: ${post.opportunityScore}`} color="secondary" />
          <Chip label={`Upvote ratio: ${(post.upvote_ratio * 100).toFixed(0)}%`} />
          {tags.map((tag) => (
            <Chip key={tag} label={tag} variant="outlined" />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Posted by u/{post.author}
        </Typography>
        <Button
          size="small"
          variant="contained"
          color="primary"
          endIcon={<ExternalLink size={16} />}
          component="a"
          href={`https://reddit.com${post.permalink}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Thread
        </Button>
      </CardActions>
    </Card>
  );
}

export default function RedditIdeaFinder() {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [subredditInput, setSubredditInput] = useState(DEFAULT_SUBREDDITS);
  const [timeRange, setTimeRange] = useState('week');
  const [minUpvotes, setMinUpvotes] = useState(0);
  const [enforceAppIntent, setEnforceAppIntent] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const keywordTokens = useMemo(() => extractKeywords(keywords), [keywords]);
  const insights = useMemo(() => computeInsights(posts), [posts]);

  const handleSearch = async () => {
    setLoading(true);
    setError('');

    const subredditList = parseSubreddits(subredditInput);
    const targets = subredditList.length ? subredditList : [null];
    const mergedPosts = new Map();

    const baseQuery = enforceAppIntent ? `${keywords} AND (app OR "build an app" OR software OR tool)` : keywords;

    try {
      for (const subreddit of targets) {
        const params = new URLSearchParams({
          q: baseQuery,
          sort: 'new',
          limit: '50',
          t: timeRange,
        });

        const url = subreddit
          ? `https://www.reddit.com/r/${subreddit}/search.json?${params.toString()}&restrict_sr=1`
          : `https://www.reddit.com/search.json?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'OpportunityFinderBot/0.1 by OpenAI-Agent',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load data from r/${subreddit || 'all'}`);
        }

        const json = await response.json();
        const newPosts = (json?.data?.children || [])
          .map(({ data }) => ({
            id: data.id,
            title: data.title,
            selftext: data.selftext || '',
            score: data.score,
            num_comments: data.num_comments,
            permalink: data.permalink,
            created_utc: data.created_utc,
            subreddit: data.subreddit,
            author: data.author,
            upvote_ratio: data.upvote_ratio || 0,
            flair: data.link_flair_text,
            is_self: data.is_self,
          }))
          .filter((post) => post.score >= minUpvotes);

        newPosts.forEach((post) => {
          if (!mergedPosts.has(post.id)) {
            mergedPosts.set(post.id, post);
          }
        });
      }

      const processed = Array.from(mergedPosts.values()).map((post) => ({
        ...post,
        opportunityScore: calculateOpportunityScore(post, keywordTokens),
      }));

      processed.sort((a, b) => b.opportunityScore - a.opportunityScore);
      setPosts(processed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load Reddit data.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Reddit Opportunity Radar
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Discover fresh Reddit discussions where people are actively asking for software or app solutions you can build.
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            title="Search Parameters"
            subheader="Adjust the filters to focus on the kinds of problems you want to solve."
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Keyword strategy"
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  helperText="Use OR to explore multiple phrases. We automatically prioritize posts that sound like app requests."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Subreddits"
                  value={subredditInput}
                  onChange={(event) => setSubredditInput(event.target.value)}
                  helperText="Comma separated list (no r/ prefix). Leave blank to search all of Reddit."
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Time window
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={timeRange}
                  onChange={(_, value) => value && setTimeRange(value)}
                >
                  {timeRanges.map((range) => (
                    <ToggleButton key={range.value} value={range.value}>
                      {range.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Minimum upvotes
                </Typography>
                  <Stack spacing={1} sx={{ px: 1 }}>
                    <Slider
                      value={minUpvotes}
                      onChange={(_, value) =>
                        setMinUpvotes(Array.isArray(value) ? value[0] : value)
                      }
                      step={1}
                      min={0}
                      max={50}
                      valueLabelDisplay="auto"
                    />
                  <Typography variant="caption" color="text.secondary">
                    Filter out low-signal threads by requiring a minimum score.
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enforceAppIntent}
                      onChange={(event) => setEnforceAppIntent(event.target.checked)}
                    />
                  }
                  label="Prioritize app-building intent"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 0.5 }}>
                  Adds signals like "build an app" and "software tool" to the search query.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                startIcon={<Search size={18} />}
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? 'Searching…' : 'Find opportunities'}
              </Button>
              <Tooltip title="Download current results as CSV">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<Download size={18} />}
                    onClick={() => downloadCsv(posts)}
                    disabled={!posts.length || loading}
                  >
                    Export CSV
                  </Button>
                </span>
              </Tooltip>
            </Stack>
            <Stack spacing={1} alignItems="flex-end">
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last updated {lastUpdated.toLocaleTimeString()}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<RefreshCcw size={16} />}
                onClick={handleSearch}
                disabled={loading}
              >
                Refresh
              </Button>
            </Stack>
          </CardActions>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !posts.length && !error && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                No opportunities found yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try expanding your keywords, exploring more subreddits, or lowering the minimum upvote filter.
              </Typography>
            </CardContent>
          </Card>
        )}

        {!loading && insights && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader title="Insight summary" subheader="Where the strongest signals are coming from" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    {insights.totalPosts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Qualified Reddit threads that match your filters.
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2">Average opportunity score</Typography>
                  <Typography variant="h6">{insights.averageScore}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Top subreddits
                  </Typography>
                  <Stack spacing={1}>
                    {insights.topSubreddits.map((item) => (
                      <Chip key={item.name} label={`r/${item.name} · ${item.count}`} variant="outlined" />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Opportunity themes
                  </Typography>
                  <Stack spacing={1}>
                    {insights.topCategories.length ? (
                      insights.topCategories.map((item) => (
                        <Chip key={item.category} label={`${item.category} · ${item.count}`} variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Themes will appear once tags are detected.
                      </Typography>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Emerging keywords
                  </Typography>
                  <Stack spacing={1}>
                    {insights.topKeywords.map((item) => (
                      <Chip key={item.keyword} label={`${item.keyword} · ${item.count}`} />
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {!loading && posts.length > 0 && (
          <Stack spacing={3}>
            {posts.map((post) => (
              <OpportunityCard key={post.id} post={post} />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
