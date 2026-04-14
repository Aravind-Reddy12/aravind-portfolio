import styles from './sections.module.css';

export default function Hobbies({ headingId }) {
  return (
    <article className={styles.section}>
      <h2 id={headingId}>Hobbies</h2>
      <p className={styles.summary}>Things I enjoy when I'm not coding.</p>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Chess</h3>
        </div>
        <p>I enjoy the strategy and pattern recognition of chess — playing online and working through tactics puzzles is a great way to unwind and stay sharp.</p>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Badminton</h3>
        </div>
        <p>My go-to sport for staying active. Fast-paced, social, and a great escape from the screen.</p>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Online Gaming</h3>
        </div>
        <p>Whether it's competitive matches with friends or solo adventures, gaming is my favorite way to relax and connect with people.</p>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Reading Novels</h3>
        </div>
        <p>I love getting lost in a good story. Novels are my way of slowing down and exploring different worlds and perspectives.</p>
      </div>
    </article>
  );
}
