"use client";

import React from "react";
import styles from "@/moduleCss/feeds.module.css";
import FeedLeftComponent from "./FeedLeftComponent";
import FeedPostComponent from "./FeedPostComponent";

const FeedLayout = () => {
  // The sidebar now shows for everyone. Logged-out visitors still get the
  // ProfileCardsmall (which hides itself when anonymous) and the Recommended
  // Jobs section, which shows a login prompt instead of personalised jobs.
  return (
    <div className="container mx-auto mt-6 px-4">
      <div className={`${styles.feed_row} max-content-height`}>
        <div className="col-lg-4 full-width-midium">
          <FeedLeftComponent />
        </div>
        <div className="col-lg-8 full-width-midium">
          <FeedPostComponent />
        </div>
      </div>
    </div>
  );
};

export default FeedLayout;
