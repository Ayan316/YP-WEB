import styles from "../../moduleCss/messages.module.css";
import Image from "next/image";
import { formatChatDate } from "@/helpers/dateFormatter";
import Avatar from "../commonUI/Avatar";
import { useUserProfile } from "@/app/hooks/useUserProfile";

export type ChatUser = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  hasMedia?: any[];
  lastMessageSenderId?: string;
  unseen_count?: string;
};

type Props = {
  user: ChatUser;
  onClick: () => void;
  isActive: boolean;
};

export default function ConversationItem({ user, onClick, isActive }: Props) {
  const { data } = useUserProfile();
  const currentUserId = data?.data?.id;

  const isMe = user.lastMessageSenderId === currentUserId;

  const hasMedia = Array.isArray(user.hasMedia) && user.hasMedia.length > 0;

  let previewMessage = "No messages yet";

  if (hasMedia) {
    previewMessage = isMe
      ? "You sent an image"
      : `${user.first_name} sent you an image`;
  } else if (user.lastMessage?.trim()) {
    previewMessage = user.lastMessage;
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${styles.conversationItem_card}
        card-hover
        ${isActive ? "active-card-profile" : ""}
      `}
    >
      {/* <Image
        src={user.avatar ?? "/profile/default_user_icon.png"}
        width={70}
        height={70}
        alt={user.name}
        className=""
      /> */}

      <Avatar
        imageUrl={user?.avatar || null}
        firstName={user?.first_name}
        lastName={user?.last_name}
        className={`w-full h-full object-cover ${styles.chatHeader_avatar} cursor-pointer`}
      />

      <div className="w-full">
        <div className={styles.conversationItem_card_title_wrapper}>
          <h2 className={`${styles.conversationItem_card_title} truncate-1`}>
            {user.name}
          </h2>
          {/* {user.unseen_count !== "0" && <span className={styles.badge}>{user.unseen_count}</span>} */}
          {Number(user.unseen_count) > 0 && (
            <span className={styles.badge}>{user.unseen_count}</span>
          )}
        </div>
        {/* <p
          className={`${styles.conversationItem_card_last_message} truncate-1`}
        >
          {user.lastMessage || "No messages yet"}
        </p> */}

        <p
          className={`${styles.conversationItem_card_last_message} truncate-1`}
        >
          {previewMessage}
        </p>

        <p className={`${styles.conversationItem_card_last_date} truncate-1`}>
          {formatChatDate(user.lastMessageDate || "No messages yet")}
        </p>
      </div>
    </div>
  );
}
