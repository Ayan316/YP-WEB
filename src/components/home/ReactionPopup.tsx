import React from 'react';
import styles from '@/moduleCss/feeds.module.css';

interface ReactionPopupProps {
  onReactionSelect: (reactionType: string) => void;
  isVisible: boolean;
  position: { top: number; left: number };
}

const ReactionPopup: React.FC<ReactionPopupProps> = ({ 
  onReactionSelect, 
  isVisible, 
  position 
}) => {
  const reactions = [
    { type: 'like', label: 'Like', emoji: '👍' },
    { type: 'love', label: 'Love', emoji: '❤️' },
    { type: 'smile', label: 'Smile', emoji: '😊' },
    { type: 'sad', label: 'Sad', emoji: '😢' }
  ];

  if (!isVisible) return null;

  return (
    <div 
      className={styles.reaction_popup}
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction.type}
          className={styles.reaction_button}
          onClick={() => onReactionSelect(reaction.type)}
          aria-label={reaction.label}
        >
          <span className={styles.reaction_emoji}>{reaction.emoji}</span>
          <span className={styles.reaction_label}>{reaction.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ReactionPopup;