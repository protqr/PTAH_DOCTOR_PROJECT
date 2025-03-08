import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const socket = io("http://localhost:5100", { reconnection: true });

const RespondBlog = () => {
  const location = useLocation();
  const { post } = location.state || {};
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newReply, setNewReply] = useState(""); // state for new replies
  const [replyTo, setReplyTo] = useState(null); // track which comment you're replying to
  
  
  if (!post) {
    return <p>ไม่พบข้อมูลกระทู้</p>;
  }

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { data } = await axios.get(`/api/v1/posts/${post._id}`);
        setComments(data.post.comments || []);
      } catch (error) {
        toast.error("ไม่สามารถโหลดความคิดเห็นได้");
      }
    };

    fetchComments();
    socket.on("new-comment", (updatedComments) => {
      setComments(updatedComments);
    });

    return () => {
      socket.off("new-comment");
    };
  }, [post._id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error("กรุณาใส่ความคิดเห็น");
      return;
    }

    try {
      const { data } = await axios.put( `/api/v1/posts/comment/post/${post._id}`,{
          comment: newComment,
        });
      if (data.success) {
        setNewComment(""); // รีเซ็ตฟอร์ม
        toast.success("เพิ่มความคิดเห็นสำเร็จ");
        setComments(data.post.comments);
        socket.emit("comment", data.post.comments);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น");
    }
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    if (!newReply.trim()) {
      toast.error("กรุณาใส่คำตอบ");
      return;
    }

    try {
      const { data } = await axios.put(
        `/api/v1/posts/comment/reply/${post._id}/${commentId}`,
        {
          replyText: newReply, // ส่ง replyText แทน reply
        },

      );
      if (data.success) {
        setNewReply(""); // รีเซ็ตฟอร์มคำตอบ
        setReplyTo(null); // ปิดการตอบกลับ
        toast.success("ตอบกลับความคิดเห็นสำเร็จ");
        setComments(data.post.comments);
        socket.emit("reply", data.post.comments);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการตอบกลับความคิดเห็น");
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8">
      <div className="border p-6 rounded-lg shadow-lg bg-white mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{post.title}</h2>
        <p className="text-gray-700 mb-6 text-justify">{post.content}</p>
        <p className="text-blue-700 mb-6">#{post.tag}</p>
        <div className="text-sm text-gray-500 mb-2 flex items-center">
          <span className="font-semibold">
            สร้างโดย :{" "}
            {post.postedBy
              ? post.postedBy.nametitle
                ? `${post.postedBy.nametitle} ${post.postedBy.name} ${post.postedBy.surname}`
                : `${post.postedBy.name} ${post.postedBy.surname}`
              : "ผู้โพสต์ไม่ทราบ"}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">ความคิดเห็นทั้งหมด:</h3>
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="p-4 border rounded-lg bg-gray-50"
              >
                <p className="font-medium text-gray-600">
                  ตอบกลับโดย:{" "}
                  {comment.postedByPersonnel
                    ? `${comment.postedByPersonnel.nametitle} ${comment.postedByPersonnel.name} ${comment.postedByPersonnel.surname}`
                    : comment.postedByUser
                    ? `${comment.postedByUser.name} ${comment.postedByUser.surname}`
                    : "ผู้ใช้"}
                </p>

                <p className="text-gray-700 mt-2">{comment.text}</p>

                {/* แสดงฟอร์มการตอบกลับ */}
                <div className="mt-4">
                  {replyTo === comment._id ? (
                    <form onSubmit={(e) => handleReplySubmit(e, comment._id)}>
                      <textarea
                        className="w-full p-3 border rounded-lg"
                        placeholder="พิมพ์คำตอบ..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2"
                      >
                        ส่งคำตอบ
                      </button>
                    </form>
                  ) : (
                    <button
                      className="text-blue-500 text-sm"
                      onClick={() => setReplyTo(comment._id)}
                    >
                      ตอบกลับ
                    </button>
                  )}
                </div>

                {/* แสดงคำตอบของความคิดเห็น */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-6 border-l-2 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply._id} className="mb-2">
                        <p className="text-gray-600 text-sm">
                          ↪ ตอบโดย:{" "}
                          {reply.postedByPersonnel
                            ? `${reply.postedByPersonnel.nametitle} ${reply.postedByPersonnel.name} ${reply.postedByPersonnel.surname}`
                            : reply.postedByUser
                            ? `${reply.postedByUser.name} ${reply.postedByUser.surname}`
                            : "ผู้ใช้"}
                        </p>

                        <p className="text-gray-700 text-sm">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">ยังไม่มีความคิดเห็น</p>
        )}
      </div>

      <form onSubmit={handleCommentSubmit}>
        <textarea
          className="w-full p-3 border rounded-lg"
          placeholder="พิมพ์ความคิดเห็น..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          ส่งความคิดเห็น
        </button>
      </form>
    </div>
  );
};

export default RespondBlog;
