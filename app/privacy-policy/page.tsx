export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold mb-8">Privacy Policy for Fin AI</h1>

                <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                    <p>
                        Welcome to Fin AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience while using our AI assistant services.
                        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                    <p>We may collect information about you in a variety of ways. The information we may collect on the Application includes:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, phone number (for WhatsApp integration), and email address that you voluntarily give to us.</li>
                        <li><strong>Chat Data:</strong> The content of the messages you send to Fin AI, which is processed to provide you with intelligent responses.</li>
                        <li><strong>Usage Data:</strong> Information about your activity on our application, such as valid commands and interaction frequency.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>Provide, operate, and maintain our AI assistant services.</li>
                        <li>Improve, personalize, and expand our services.</li>
                        <li>Understand and analyze how you use our services.</li>
                        <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Disclosure of Your Information</h2>
                    <p>
                        We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                    </p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                        <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
                    <p>
                        We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
                    <p>
                        If you have questions or comments about this Privacy Policy, please contact us at: support@fin-ai.app
                    </p>
                </section>

                <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
                    <a href="/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        &larr; Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
