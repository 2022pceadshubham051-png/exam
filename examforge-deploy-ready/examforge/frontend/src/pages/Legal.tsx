import { Link } from "react-router-dom";
import { Doc, UPDATED } from "./Info"; import { SITE, CONTACT_EMAIL } from "../lib/content";
const Mail_ = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export const Terms = () => <Doc title="Terms & Conditions">
  <p className="muted">Last updated: {UPDATED}</p>
  <p>These Terms &amp; Conditions ("Terms") govern your use of the {SITE} website and app ("the Service"). By registering, enrolling in a course or using the Service you agree to these Terms and to our <Link to="/privacy">Privacy Policy</Link> and <Link to="/refund">Refund Policy</Link>. If you do not agree, please do not use the Service.</p>

  <h2>1. Eligibility and your account</h2>
  <ul>
    <li>You must provide correct information and keep your password confidential. You are responsible for all activity under your account.</li>
    <li>If you are under 18, you may use the Service only with the consent of a parent or guardian.</li>
    <li>You may verify your email address, and you may sign in with Google. We may require email verification before you can log in.</li>
    <li><b>One person, up to two devices.</b> An account is for one student. It can be logged in on at most <b>two devices</b> at a time; signing in on a new device automatically signs out the least recently used one. Sharing your account with others is not allowed.</li>
  </ul>

  <h2>2. Courses, tests and content</h2>
  <ul>
    <li>Courses consist of video lessons, notes and linked practice tests. Course descriptions, syllabus and the number of lessons may be updated or extended over time.</li>
    <li>Content is educational support. We do not promise any particular exam result, rank or selection.</li>
    <li>We try to keep questions, answers and explanations accurate, but errors can occur. Please report them to <Mail_ />.</li>
    <li>Features such as the AI tutor give automatically generated help that may be incomplete or wrong. Please verify important points from your books and teacher.</li>
  </ul>

  <h2>3. Paid courses, prices and payment</h2>
  <ul>
    <li>The price of a course is shown in Indian Rupees on its page before you enrol. Prices and offers can change, but a change does not affect a course you have already paid for.</li>
    <li>For paid courses you pay to the account shown on the course page and submit the transaction ID. Access starts after we verify the payment, which may take some time. If a payment cannot be matched, we may ask for proof or decline the enrolment.</li>
    <li><b>Coupons</b> are valid only for the course, period and number of uses stated; they cannot be exchanged for cash and may be withdrawn if misused.</li>
    <li>Entering a false transaction ID or any fraudulent payment will lead to removal of access and may be reported to the authorities.</li>
  </ul>

  <h2>4. Your licence and what is not allowed</h2>
  <p>When you enrol, we give you a personal, non-exclusive, non-transferable licence to watch the course and read its notes for your own preparation, for as long as the Service offers the course and your access is active. All videos, notes, questions, images and software belong to {SITE} or its licensors and are protected by copyright.</p>
  <p>You must not:</p>
  <ul>
    <li>record, screen-capture, download (except through a download option we provide), copy, upload, sell, share or publish lecture videos, notes or questions, or share links to them;</li>
    <li>remove or hide the watermark shown on videos, or try to bypass any access or device limit;</li>
    <li>share your login with others or resell access to a course;</li>
    <li>use bots, scrapers or automated tools, probe or disrupt the Service, or try to access other users' data;</li>
    <li>post unlawful, abusive, misleading or spam content in doubts, reviews or messages, or cheat in tests and leaderboards.</li>
  </ul>
  <p>Lecture videos carry a watermark with your name and email so that leaks can be traced. If we find that content from your account has been shared or leaked, we may <b>suspend or terminate your access without refund</b> and take legal action where appropriate.</p>

  <h2>5. Offline downloads</h2>
  <p>Where a download option is shown, the saved video or notes are for your own use on your device, may expire after a set period (for example 7 days) and are removed when you log out. Downloaded content remains our property and is subject to section 4.</p>

  <h2>6. Your content</h2>
  <p>You are responsible for the notes, reviews, doubts and replies you post. You allow us to display them within the Service (reviews and doubts may be seen by other enrolled students and by visitors of the public course page, shown with your first name and last initial). We may remove content that breaks these Terms.</p>

  <h2>7. Third-party services</h2>
  <p>The Service uses third parties such as Google (sign-in and YouTube), video-hosting providers, email and hosting providers. Their services may be unavailable or change, and their own terms apply when you use them. We are not responsible for their failures, but we will try to restore your access.</p>

  <h2>8. Availability</h2>
  <p>We try to keep the Service running at all times but cannot guarantee uninterrupted access. We may carry out maintenance, change features, or discontinue a course. If we permanently remove a paid course within your access period, we will offer a suitable alternative or refund in line with the <Link to="/refund">Refund Policy</Link>.</p>

  <h2>9. Suspension and termination</h2>
  <p>We may suspend or end your access if you break these Terms, share your account, commit payment fraud or harm other users or the Service. You may stop using the Service at any time and ask us to delete your account by writing to <Mail_ />.</p>

  <h2>10. Disclaimer and limit of liability</h2>
  <p>The Service is provided "as is" and "as available". To the extent allowed by law, {SITE} is not liable for indirect or consequential losses, loss of data, or for exam results, and our total liability for any claim relating to a course is limited to the amount you paid for that course.</p>

  <h2>11. Governing law</h2>
  <p>These Terms are governed by the laws of India. Any dispute will first be tried to be settled by talking to us at <Mail_ />; if it is not resolved, the courts in India having jurisdiction will decide it.</p>

  <h2>12. Changes</h2>
  <p>We may update these Terms. The date above shows the latest version. If you continue to use the Service after a change, you accept the new Terms. For important changes we will inform you in the app or by email.</p>

  <h2>13. Contact</h2>
  <p>Questions about these Terms: <Mail_ />.</p>
</Doc>;

export const Refund = () => <Doc title="Refund & Cancellation Policy">
  <p className="muted">Last updated: {UPDATED}</p>
  <p>We want you to be sure before you buy. Please read the course page, check the free preview lessons (where available) and contact us with any question <b>before</b> you pay. This policy explains when refunds are given.</p>

  <h2>1. Free content</h2>
  <p>Mock tests, free courses and free preview lessons cost nothing, so no refund applies.</p>

  <h2>2. Paid courses</h2>
  <p>Because a paid course gives you immediate digital access to videos and notes that cannot be returned, <b>payments are generally non-refundable once access has been given</b>. We make the following exceptions, which are reviewed case by case:</p>
  <ul>
    <li><b>Duplicate or wrong payment:</b> if you paid twice for the same course, or paid an amount different from the price shown, we refund the extra amount.</li>
    <li><b>Payment made but access not given:</b> if your payment is not approved within <b>3 working days</b> and we cannot enrol you, you will get a full refund.</li>
    <li><b>Course not as described or not delivered:</b> if the course is materially different from its description, or we discontinue it, you can ask for a refund of the unused part of the course, or we will offer an alternative course.</li>
    <li><b>Technical problem we cannot fix:</b> if you cannot access the content because of a fault on our side that we fail to fix within a reasonable time, you can ask for a refund.</li>
    <li><b>Early request:</b> if you ask within <b>48 hours</b> of enrolling and have watched <b>less than 10%</b> of the course, you may ask for a refund; it is at our discretion and the decision is based on your usage.</li>
  </ul>

  <h2>3. When refunds are not given</h2>
  <ul>
    <li>Change of mind, or exam date or plan changes, after you have used the course.</li>
    <li>Access removed because of breach of the <Link to="/terms">Terms</Link>, including sharing the account, recording or leaking videos, or payment fraud.</li>
    <li>Problems caused by your device, internet connection or browser settings, which can be solved by contacting us.</li>
    <li>Coupon or discount value, which is not refundable in cash.</li>
  </ul>

  <h2>4. How to ask for a refund</h2>
  <p>Email <Mail_ /> from your registered email with: course name, date of payment, amount, the UPI transaction ID, and the reason. We may ask for a screenshot of the payment.</p>

  <h2>5. How refunds are paid</h2>
  <p>Approved refunds are sent to the same bank account/UPI ID the payment came from, usually within <b>7 to 10 working days</b> after approval. Bank or gateway charges, if any, may be deducted. Your access to the course ends when a refund is made.</p>

  <h2>6. Cancellation</h2>
  <p>There is no subscription and no automatic renewal. You pay once for a course, and you do not need to cancel anything. You can ask us to close your account at any time.</p>

  <h2>7. Contact</h2>
  <p>Refund and payment questions: <Mail_ />.</p>
</Doc>;
