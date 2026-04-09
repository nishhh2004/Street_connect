import React, { useState } from 'react';
import { X, HelpCircle, MessageSquare, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Phone, Mail, CreditCard, Truck, UtensilsCrossed, UserCog, Star, FileText, Headphones, CheckCircle, ArrowLeft } from 'lucide-react';

function HelpSupport({ onClose, role }) {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeSection, setActiveSection] = useState('faq');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueDesc, setIssueDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const faqs = {
    customer: [
      { q: "Where is my order?", a: "Track your order live on the map in the customer dashboard once accepted by the vendor and rider. You'll see real-time location updates as the rider picks up and delivers your food." },
      { q: "How does StreetVIP work?", a: "StreetVIP is our premium subscription that gives you FREE delivery on all orders, priority customer support, exclusive restaurant deals, and early access to new features. Subscribe from your profile menu!" },
      { q: "How do I cancel an order?", a: "You can cancel a pending order before the restaurant accepts it. Once accepted, cancellation may attract a fee. Contact support for help with cancellations." },
      { q: "How are delivery charges calculated?", a: "Delivery fees are based on distance from the restaurant to your location. A base fee of ₹30 applies plus ₹1 per 100 meters. StreetVIP members get FREE delivery on all orders!" },
      { q: "What payment methods are accepted?", a: "We currently support Cash on Delivery (COD). UPI, credit/debit cards, and wallet payments are coming soon via Razorpay integration." },
      { q: "How do I report wrong or missing items?", a: "Go to your Past Orders, select the order, and use the 'Report Issue' option. Our team will review and process a refund or replacement within 24 hours." },
    ],
    vendor: [
      { q: "How to add new menu items?", a: "Use the 'Create New Item' button in the Inventory Management section on the right side of your dashboard. Enter the item name, price, and category." },
      { q: "Can I go offline temporarily?", a: "Yes! Toggle your Store Status at the top of your dashboard. When offline, your restaurant won't appear to customers and you won't receive new orders." },
      { q: "How do I pause specific items?", a: "In the Inventory Management section, click the 'Pause Item' button on any menu item. Paused items won't be visible to customers. Click 'Activate' to bring them back." },
      { q: "How are my earnings calculated?", a: "Your gross earnings show the total value of all delivered orders. StreetConnect charges a small platform fee which is settled weekly." },
      { q: "What happens when I reject an order?", a: "Rejected orders are cancelled and the customer is notified. Try to minimize rejections as it affects your restaurant rating. If an item is out of stock, pause it instead." },
      { q: "When do I receive payouts?", a: "Payouts are processed weekly every Monday. You can view your earnings breakdown in the dashboard. Minimum payout threshold is ₹500." },
    ],
    delivery: [
      { q: "How do I contact the customer?", a: "The customer's phone number and address are provided on active delivery tickets. Tap the phone number to call directly." },
      { q: "How is my earnings/payout calculated?", a: "You earn ₹20 base + 15% of order value per delivery. Payouts are processed daily to your registered bank account." },
      { q: "What if the restaurant isn't ready?", a: "Wait at the restaurant for up to 15 minutes. If the order still isn't ready, contact support for further instructions. You may receive waiting compensation." },
      { q: "Can I reject a delivery request?", a: "Yes, you can skip delivery requests. However, maintaining a high acceptance rate helps you receive more orders and earn bonuses." },
      { q: "What if I have an accident during delivery?", a: "Your safety is our priority! Call emergency services first, then contact our 24/7 safety hotline. We provide insurance coverage for active deliveries." },
      { q: "What are peak hour bonuses?", a: "During peak hours (12–2 PM and 7–10 PM), you earn 1.5x the regular delivery fee. Surge pricing during rain or high demand can go up to 2x." },
    ]
  };

  const generalIssues = [
    { title: "Payment not processed", desc: "Refund will be initiated within 3-5 business days", iconName: "credit-card", color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Order delayed significantly", desc: "Get real-time updates or request cancellation", iconName: "truck", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Wrong or missing items", desc: "Report and get refund or replacement", iconName: "utensils", color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Food quality complaint", desc: "Rate and report food quality issues", iconName: "star", color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Account & login issues", desc: "Reset password, update profile, or deactivate", iconName: "user", color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Invoice or billing query", desc: "Download invoices or dispute charges", iconName: "file", color: "text-gray-500", bg: "bg-gray-100" },
  ];

  const vendorIssues = [
    { title: "Payout not received", desc: "Check payout status and raise a ticket", iconName: "credit-card", color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Menu not updating", desc: "Sync issues with inventory management", iconName: "utensils", color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Unfair rating/review", desc: "Dispute customer reviews with evidence", iconName: "star", color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Account verification pending", desc: "FSSAI license and document verification status", iconName: "user", color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Rider not arriving for pickup", desc: "Request re-assignment or escalate", iconName: "truck", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Tax & GST queries", desc: "Download GST invoices and compliance docs", iconName: "file", color: "text-gray-500", bg: "bg-gray-100" },
  ];

  const deliveryIssues = [
    { title: "Earnings discrepancy", desc: "Review trip-wise earnings breakdown", iconName: "credit-card", color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Navigation/map issues", desc: "Report wrong addresses or map errors", iconName: "truck", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Account blocked/restricted", desc: "Review violations and appeal process", iconName: "user", color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Safety incident report", desc: "Report accidents, harassment, or threats", iconName: "star", color: "text-red-500", bg: "bg-red-50" },
    { title: "Rating dispute", desc: "Contest unfair customer ratings", iconName: "star", color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Document re-verification", desc: "Update expired documents or vehicle info", iconName: "file", color: "text-gray-500", bg: "bg-gray-100" },
  ];

  const iconMap = {
    "credit-card": <CreditCard className="w-5 h-5" />,
    "truck": <Truck className="w-5 h-5" />,
    "utensils": <UtensilsCrossed className="w-5 h-5" />,
    "star": <Star className="w-5 h-5" />,
    "user": <UserCog className="w-5 h-5" />,
    "file": <FileText className="w-5 h-5" />,
  };

  const roleFaqs = faqs[role] || faqs.customer;
  const roleIssues = role === 'vendor' ? vendorIssues : role === 'delivery' ? deliveryIssues : generalIssues;

  const toggleFaq = (index) => setExpandedFaq(expandedFaq === index ? null : index);

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedIssue(null);
      setIssueDesc('');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex justify-between items-center text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            {selectedIssue && !submitted && (
              <button onClick={() => setSelectedIssue(null)} className="p-1.5 rounded-full hover:bg-white/20 mr-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <HelpCircle className="w-6 h-6" />
            <h2 className="text-xl font-black font-heading">
              {selectedIssue ? (submitted ? 'Ticket Submitted' : selectedIssue.title) : 'Help & Support'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5"/></button>
        </div>

        {/* Tab Navigation — only show when not in issue detail */}
        {!selectedIssue && (
          <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <button onClick={() => setActiveSection('faq')} className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'faq' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <MessageSquare className="w-4 h-4 inline mr-1.5" />FAQs
            </button>
            <button onClick={() => setActiveSection('issues')} className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'issues' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <AlertTriangle className="w-4 h-4 inline mr-1.5" />Issues
            </button>
            <button onClick={() => setActiveSection('contact')} className={`flex-1 py-3 text-sm font-bold transition-all ${activeSection === 'contact' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <Headphones className="w-4 h-4 inline mr-1.5" />Contact
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Issue Detail / Report Form */}
          {selectedIssue && !submitted && (
            <div className="space-y-4">
              <div className={`flex items-center p-4 rounded-2xl ${selectedIssue.bg} border border-gray-100`}>
                <div className={`p-2.5 rounded-xl bg-white mr-4 flex-shrink-0 ${selectedIssue.color}`}>
                  {iconMap[selectedIssue.iconName]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedIssue.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedIssue.desc}</p>
                </div>
              </div>
              <form onSubmit={handleIssueSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Describe your issue</label>
                  <textarea
                    value={issueDesc}
                    onChange={e => setIssueDesc(e.target.value)}
                    required
                    rows={4}
                    placeholder="Please describe the issue in detail so we can help you faster..."
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-indigo-400 focus:ring-0 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Order ID (optional)</label>
                  <input type="text" placeholder="e.g. ABC123" className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-indigo-400 focus:ring-0 focus:outline-none" />
                </div>
                <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                  Submit Support Ticket
                </button>
                <button type="button" onClick={() => setSelectedIssue(null)} className="w-full py-2 text-sm text-gray-500 font-bold hover:text-gray-700">
                  ← Back to issues
                </button>
              </form>
            </div>
          )}

          {/* Submitted Success */}
          {selectedIssue && submitted && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-black text-xl text-gray-900 mb-2">Ticket Raised!</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Your support ticket has been submitted. Our team will get back to you within 4-6 hours.</p>
              <p className="text-indigo-600 font-bold text-sm mt-3">Ticket #TKT-{Math.random().toString(36).substr(2,6).toUpperCase()}</p>
            </div>
          )}

          {/* FAQ Section */}
          {!selectedIssue && activeSection === 'faq' && (
            <div className="space-y-2">
              {roleFaqs.map((faq, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-indigo-100">
                  <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors">
                    <p className="font-bold text-sm text-gray-800 pr-4">{faq.q}</p>
                    {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-indigo-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-4 pb-4 pt-2 text-sm text-gray-600 leading-relaxed bg-indigo-50/30 border-t border-indigo-50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Issues Section */}
          {!selectedIssue && activeSection === 'issues' && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tap an issue to report it</p>
              {roleIssues.map((issue, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedIssue(issue); setIssueDesc(''); setSubmitted(false); }}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex items-center group"
                >
                  <div className={`p-2.5 rounded-xl ${issue.bg} group-hover:bg-white transition-colors mr-4 flex-shrink-0 ${issue.color}`}>
                    {iconMap[issue.iconName]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{issue.desc}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-indigo-400 transition-colors ml-2 text-lg">→</span>
                </button>
              ))}
            </div>
          )}

          {/* Contact Section */}
          {!selectedIssue && activeSection === 'contact' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-indigo-500" /> 24/7 Helpline
                </h4>
                <p className="text-2xl font-black text-indigo-600 mb-1">1-800-STREET</p>
                <p className="text-xs text-gray-500 font-medium">Available round the clock for urgent issues</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-indigo-500" /> Email Support
                </h4>
                <p className="text-sm font-bold text-indigo-600">support@streetconnect.in</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Response within 4-6 hours</p>
              </div>

              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-rose-500" /> Admin Contact
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-rose-600">+91 98765 43210</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-rose-600">admin@streetconnect.in</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-3">
                <ShieldCheck className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-900">Safety First</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                    For emergencies, safety threats, or accidents, call our dedicated safety hotline immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
