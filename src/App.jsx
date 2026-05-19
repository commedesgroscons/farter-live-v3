import { useEffect, useState } from "react";
import { isConfigured, supabase } from "./supabase";

function getTier(score) {
  if (score >= 92) return "Nuclear Grade";
  if (score >= 80) return "Thunderclass";
  if (score >= 68) return "Air Strike";
  return "Low Pressure";
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConfigured) {
      setError("Supabase is not configured.");
      return;
    }

    fetchPosts();
    fetchMessages();

    const postsChannel = supabase
      .channel("posts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("messages-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setPosts(data || []);
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setMessages(data || []);
  }

  async function dropAudio() {
    const score = Math.floor(58 + Math.random() * 42);

    const { error } = await supabase.from("posts").insert({
      username: "@you",
      score,
      tier: getTier(score),
      duration: `${(1.4 + Math.random() * 4.8).toFixed(1)}s`,
      reactions: 0,
      audio_url: ""
    });

    if (error) {
      setError(error.message);
    }
  }

  async function sendMessage() {
    if (!chatText.trim()) return;

    const { error } = await supabase.from("messages").insert({
      username: "@you",
      content: chatText.trim()
    });

    if (error) {
      setError(error.message);
      return;
    }

    setChatText("");
  }

  if (!entered) {
    return (
      <main className="landing">
        <nav className="nav">
          <div className="brand">
            <div className="logo">F</div>
            FARTER
          </div>
          <div className="navLinks">
            <span>Live room</span>
            <span>Duels</span>
            <span>Leaderboards</span>
            <span>Verified audio</span>
          </div>
        </nav>

        <section className="hero">
          <div className="livePill">
            <i />
            {12842 + posts.length * 23} people live right now
          </div>

          <h1>Humanity's first real-time gas network.</h1>

          <p>
            Join one global room. Drop verified audio. React, vote, duel, and
            climb the daily, weekly and monthly rankings.
          </p>

          <div className="buttons">
            <button className="primary" onClick={() => setEntered(true)}>
              ENTER THE ROOM
            </button>
            <button className="secondary" onClick={() => setEntered(true)}>
              View leaderboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="appHeader">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            FARTER
            <small>Global room · {12842 + posts.length * 23} live</small>
          </div>
        </div>

        <div className="headerActions">
          <button className="ghost">Start duel</button>
          <button className="primary compact" onClick={dropAudio}>
            Drop audio
          </button>
        </div>
      </header>

      {error && <div className="errorBox">{error}</div>}

      <div className="grid">
        <aside className="left">
          <section className="panel">
            <div className="panelTitle">
              <h2>🏆 Leaderboard</h2>
            </div>

            {[...posts]
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((post, index) => (
                <div className="rankRow" key={post.id}>
                  <div className="rankLeft">
                    <span className="rankNo">{index + 1}</span>
                    <div>
                      <strong>{post.username}</strong>
                      <p>{post.tier}</p>
                    </div>
                  </div>
                  <b>{post.score}</b>
                </div>
              ))}
          </section>

          <section className="panel">
            <div className="panelTitle">
              <h2>⚔️ Duel live</h2>
              <span className="pillLight">Round 2 / 3</span>
            </div>

            <div className="duelGrid">
              <button className="duelBox">
                <span>@DeepRoom</span>
                <strong>89</strong>
                <div className="meter">
                  <i style={{ width: "47%" }} />
                </div>
                <small>214 votes</small>
              </button>

              <button className="duelBox">
                <span>@GasDealer</span>
                <strong>91</strong>
                <div className="meter">
                  <i style={{ width: "53%" }} />
                </div>
                <small>241 votes</small>
              </button>
            </div>

            <p className="microcopy">
              Each player gets 3 chances. The global chat votes after every
              round.
            </p>
          </section>
        </aside>

        <section className="feed">
          <div className="roomIntro">
            <div>
              <h1>Global live room</h1>
              <p>One chat. One feed. Everyone live.</p>
            </div>
            <span>Live feed</span>
          </div>

          {posts.map((post) => (
            <article className="post" key={post.id}>
              <div className="postTop">
                <div>
                  <div className="eyebrow">
                    <i /> Live drop
                  </div>
                  <h3>{post.username}</h3>
                  <p>
                    {post.tier} · {post.duration}
                  </p>
                </div>

                <div className="score">
                  <span>Fart Score</span>
                  <strong>{post.score}</strong>
                </div>
              </div>

              <div className="player">
                <button className="play">▶</button>
                <div className="wave">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span
                      key={index}
                      style={{
                        height: `${Math.max(
                          8,
                          Math.min(58, Math.random() * 50 + post.score / 8)
                        )}px`
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="reactions">
                <button>💀 {post.reactions || 0}</button>
                <button>🔥 Fire</button>
                <button>☣️ Toxic</button>
                <button>Vote</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="chat">
          <div className="chatHeader">
            <h2>Live chat</h2>
            <p>Everyone in the same room.</p>
          </div>

          <div className="chatMessages">
            {messages.map((message) => (
              <div className="bubble" key={message.id}>
                <span>{message.username}</span>
                {message.content}
              </div>
            ))}
          </div>

          <div className="chatInput">
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
              placeholder="Say something..."
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
