import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import { getCartCount, subscribeToCart } from "../utils/cart.js";

function AboutUs() {
    const [cartCount, setCartCount] = useState(getCartCount());

    useEffect(() => {
        const unsubscribe = subscribeToCart((_, count) => setCartCount(count));
        return () => unsubscribe();
    }, []);

    const values = [
        {
            icon: "🛡️",
            title: "100% Health Checked",
            desc: "Every companion receives comprehensive medical examinations, necessary vaccinations, and deworming before meeting their new family.",
        },
        {
            icon: "🏡",
            title: "Ethical Adoption Only",
            desc: "We partner exclusively with verified breeders, registered shelters, and ethical foster homes with zero tolerance for unsafe breeding practices.",
        },
        {
            icon: "🚚",
            title: "Safe Pet Transit",
            desc: "Our sanitized, climate-controlled pet transportation ensures your companion arrives at your doorstep calm, healthy, and stress-free.",
        },
        {
            icon: "💬",
            title: "Verified Community Feedback",
            desc: "Real experiences and genuine reviews from verified pet parents to help you make informed, confident adoption decisions.",
        },
    ];

    const companionCategories = [
        {
            emoji: "🐶",
            name: "Dogs & Puppies",
            desc: "Loyal, energetic, and affectionate canine companions raised in gentle, social environments.",
            tag: "Dogs",
        },
        {
            emoji: "🐱",
            name: "Cats & Kittens",
            desc: "Playful, independent, and curious felines with full veterinary certifications.",
            tag: "Cats",
        },
        {
            emoji: "🦜",
            name: "Birds & Parrots",
            desc: "Friendly, hand-tamed songbirds and pairs ready to brighten your living space with cheerful melodies.",
            tag: "Birds",
        },
    ];

    return (
        <div className="bg-light min-vh-100 d-flex flex-column">
            <Navbar cartCount={cartCount} />

            <header
                className="text-white py-5 position-relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #0369a1 100%)",
                }}
            >
                <div className="container py-4">
                    <div className="row align-items-center g-4">
                        <div className="col-lg-8">
                            <span className="badge bg-white text-dark px-3 py-2 rounded-pill fw-semibold mb-3 shadow-sm">
                                🐾 Our Story & Mission
                            </span>
                            <h1 className="display-4 fw-bold mb-3">
                                Connecting Loving Families with Healthy Companions
                            </h1>
                            <p className="lead text-white-50 mb-4" style={{ maxWidth: "680px" }}>
                                PetWorld was founded with one clear commitment: to make pet adoption transparent, joyful, and completely safe for every animal and pet parent.
                            </p>
                            <div className="d-flex flex-wrap gap-3">
                                <Link
                                    to="/pets"
                                    className="btn btn-light rounded-pill px-4 py-2 fw-bold text-dark shadow-sm"
                                >
                                    Browse Companions →
                                </Link>
                                <Link
                                    to="/feedback"
                                    className="btn btn-outline-light rounded-pill px-4 py-2 fw-semibold"
                                >
                                    Read Customer Stories
                                </Link>
                            </div>
                        </div>

                        <div className="col-lg-4 text-center">
                            <div
                                className="bg-white p-4 rounded-4 shadow-lg text-dark d-inline-block text-center border"
                                style={{ maxWidth: "300px" }}
                            >
                                <span className="display-1 mb-2 d-block">🐕</span>
                                <h5 className="fw-bold text-dark mb-1">Ethical & Certified</h5>
                                <p className="text-secondary small mb-0">
                                    Trusted by thousands of pet families across the country since day one.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container py-5 flex-grow-1">
                <section className="mb-5">
                    <div className="row g-4 align-items-center">
                        <div className="col-12 col-lg-6">
                            <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill mb-2">
                                WHO WE ARE
                            </span>
                            <h2 className="fw-bold text-dark mb-3">
                                A Trusted Marketplace Built on Compassion
                            </h2>
                            <p className="text-secondary leading-relaxed mb-3">
                                Traditional pet adoption often suffers from lack of health transparency, hidden fees, and questionable breeding conditions. PetWorld changes that standard by providing a verified platform where every pet profile is vetted before being published.
                            </p>
                            <p className="text-secondary leading-relaxed mb-4">
                                Whether you are welcoming an energetic German Shepherd puppy, an affectionate Persian kitten, or a bonded pair of Lovebirds, our platform guarantees complete medical background checks, clear pricing, and dedicated post-adoption advice.
                            </p>
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                                        <div className="fs-4 fw-bold" style={{ color: "#0f766e" }}>100%</div>
                                        <div className="text-muted small">Veterinary Verified</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-white rounded-3 border shadow-2xs">
                                        <div className="fs-4 fw-bold" style={{ color: "#0f766e" }}>24 / 7</div>
                                        <div className="text-muted small">Adoption Assistance</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-lg-6">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white p-4">
                                <div className="p-4 rounded-3 text-white mb-3" style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 100%)" }}>
                                    <h5 className="fw-bold text-white mb-2">Our Quality Promise</h5>
                                    <p className="small text-white-50 mb-0">
                                        We never cut corners on animal health, hygiene, or safety. Every companion is treated with dignity, warmth, and genuine love.
                                    </p>
                                </div>
                                <ul className="list-unstyled d-flex flex-column gap-3 mb-0 text-secondary small">
                                    <li className="d-flex align-items-start gap-2">
                                        <span className="text-success fw-bold">✓</span>
                                        <span>Full vaccination history and medical records supplied with every companion.</span>
                                    </li>
                                    <li className="d-flex align-items-start gap-2">
                                        <span className="text-success fw-bold">✓</span>
                                        <span>Direct support channel for feeding guidelines and initial adjustment periods.</span>
                                    </li>
                                    <li className="d-flex align-items-start gap-2">
                                        <span className="text-success fw-bold">✓</span>
                                        <span>Zero spam, transparent pricing with no hidden administration charges.</span>
                                    </li>
                                    <li className="d-flex align-items-start gap-2">
                                        <span className="text-success fw-bold">✓</span>
                                        <span>Secure transactions with multiple verified payment methods.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-5 py-4">
                    <div className="text-center mb-5">
                        <span className="badge bg-primary bg-opacity-10 text-primary fw-bold px-3 py-2 rounded-pill mb-2">
                            OUR PRINCIPLES
                        </span>
                        <h2 className="fw-bold text-dark">Why Families Choose PetWorld</h2>
                        <p className="text-muted small">The values that guide every adoption, delivery, and customer care interaction</p>
                    </div>

                    <div className="row g-4">
                        {values.map((val, idx) => (
                            <div key={idx} className="col-12 col-sm-6 col-lg-3">
                                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 bg-white text-center d-flex flex-column">
                                    <div className="display-5 mb-3">{val.icon}</div>
                                    <h5 className="fw-bold text-dark mb-2 fs-6">{val.title}</h5>
                                    <p className="text-secondary small mb-0">{val.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-5">
                    <div className="text-center mb-5">
                        <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill mb-2">
                            COMPANIONS
                        </span>
                        <h2 className="fw-bold text-dark">Our Animal Categories</h2>
                        <p className="text-muted small">Specialized care and verified adoptions for every pet preference</p>
                    </div>

                    <div className="row g-4 justify-content-center">
                        {companionCategories.map((cat, idx) => (
                            <div key={idx} className="col-12 col-md-4">
                                <div className="card h-100 border-0 shadow-sm rounded-4 p-4 bg-white text-center d-flex flex-column align-items-center">
                                    <span className="display-4 mb-3">{cat.emoji}</span>
                                    <h5 className="fw-bold text-dark mb-2">{cat.name}</h5>
                                    <p className="text-secondary small mb-4">{cat.desc}</p>
                                    <Link
                                        to={`/pets?category=${encodeURIComponent(cat.tag)}`}
                                        className="btn btn-outline-success btn-sm rounded-pill px-4 fw-semibold mt-auto"
                                    >
                                        Explore {cat.tag} →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    className="rounded-4 p-5 text-white text-center shadow-sm"
                    style={{ background: "linear-gradient(135deg, #0f766e 0%, #047857 100%)" }}
                >
                    <h3 className="fw-bold display-6 mb-3">Ready to Welcome Your Next Companion?</h3>
                    <p className="lead text-white-50 mb-4 mx-auto" style={{ maxWidth: "600px" }}>
                        Explore healthy puppies, friendly cats, and beautiful birds ready to join loving homes today.
                    </p>
                    <div className="d-flex flex-wrap justify-content-center gap-3">
                        <Link
                            to="/pets"
                            className="btn btn-light rounded-pill px-5 py-3 fw-bold text-dark shadow"
                        >
                            Browse All Available Pets
                        </Link>
                        <Link
                            to="/feedback"
                            className="btn btn-outline-light rounded-pill px-4 py-3 fw-semibold"
                        >
                            Read Customer Reviews
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="bg-dark text-white pt-5 pb-4 mt-auto">
                <div className="container">
                    <div className="row g-4 pb-4 border-bottom border-secondary">
                        <div className="col-12 col-md-4">
                            <div className="d-flex align-items-center gap-2 fw-bold fs-4 mb-2">
                                <span>🐾</span> PetWorld
                            </div>
                            <p className="text-secondary small">
                                Dedicated full-stack pet marketplace connecting pet companions with caring homes.
                            </p>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Explore</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li>
                                    <Link to="/" className="text-decoration-none text-secondary">
                                        Home
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/pets" className="text-decoration-none text-secondary">
                                        All Pets
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/about" className="text-decoration-none text-secondary">
                                        About Us
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/feedback" className="text-decoration-none text-secondary">
                                        Customer Feedback
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="col-6 col-md-4">
                            <h6 className="fw-bold mb-3 text-white">Customer Support</h6>
                            <ul className="list-unstyled small text-secondary d-flex flex-column gap-2 mb-0">
                                <li>Email: care@petworld.com</li>
                                <li>Toll Free: 1-800-PET-LOVE</li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-3 text-center text-secondary small">
                        &copy; {new Date().getFullYear()} PetWorld Platform.
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default AboutUs;
