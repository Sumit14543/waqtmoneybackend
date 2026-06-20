const TestimonialsSection = () => {
    const cardsData = [
    {
        image: '/testimonial-avatar-1.jpg',
        name: 'Rahul Sharma',
        handle: 'Delhi',
        rating: 5,
        review: 'Waqt Money provided me with an instant salary advance during an emergency. The process was very fast and easy.'
    },
    {
        image: '/testimonial-avatar-3.jpg',
        name: 'Priya Verma',
        handle: 'Noida',
        rating: 4,
        review: 'I got a loan on my salary without any hassle. The documentation process was also simple.'
    },
    {
        image: '/testimonial-avatar-2.jpg',
        name: 'Amit Singh',
        handle: 'Gurgaon',
        rating: 5,
        review: 'Instant approval and quick disbursal solved my financial problem.'
    },
    {
        image: '/testimonial-avatar-4.jpg',
        name: 'Neha Gupta',
        handle: 'Faridabad',
        rating: 4,
        review: 'Waqt Money Pay is trustworthy. I received transparent charges and fast service.'
    },
];

    // ⭐ Star Component
    type TestimonialCard = {
        image: string;
        name: string;
        handle: string;
        rating: number;
        review: string;
    };

    const StarRating = ({ rating }: { rating: number }) => {
        return (
            <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400' : 'fill-gray-300'}`}
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.959a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.96c.3.92-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.96a1 1 0 00-.364-1.118L2.98 9.386c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.959z" />
                    </svg>
                ))}
            </div>
        );
    };

    const CreateCard = ({ card }: { card: TestimonialCard }) => (
        <div className="p-5 sm:p-6 rounded-2xl mx-3 sm:mx-5 shadow-md hover:shadow-2xl transition-all duration-300 w-[84vw] max-w-[360px] sm:w-96 sm:max-w-none shrink-0 bg-white">
            
            <div className="flex gap-3 items-center">
                <img
                    className="h-14 w-14 rounded-full object-cover"
                    src={card.image}
                    alt={`${card.name} testimonial`}
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                />
                
                <div className="flex flex-col">
                    <p className="font-semibold text-lg">{card.name}</p>
                    <span className="text-sm text-gray-500">{card.handle}</span>

                    {/* ⭐ Rating */}
                    <StarRating rating={card.rating} />
                </div>
            </div>

            <p className="text-base py-5 text-gray-700 leading-relaxed">
                "{card.review}"
            </p>
        </div>
    );

    return (
        <section className="py-20 bg-[linear-gradient(135deg,#f8fafc,#eef2ff)]">
            
            <div className="max-w-7xl mx-auto px-4">

                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Waqt Money <span className="text-purple-600">Customers Say</span>
                    </h2>
                    <p className="text-gray-500 text-lg">
                        Real experiences of people who used Waqt Money for instant salary loans.
                    </p>
                </div>

                <style>{`
                    @keyframes marqueeScroll {
                        0% { transform: translateX(0%); }
                        100% { transform: translateX(-50%); }
                    }

                    .marquee-inner {
                        animation: marqueeScroll 24s linear infinite;
                    }

                    .marquee-reverse {
                        animation-direction: reverse;
                    }

                    @media (max-width: 640px) {
                        .marquee-inner {
                            animation-duration: 20s;
                        }
                    }
                `}</style>

                <div className="w-full overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full w-8 sm:w-24 z-10 bg-gradient-to-r from-slate-50/70 sm:from-slate-50 to-transparent pointer-events-none"></div>

                    <div className="marquee-inner flex min-w-[200%] pt-8 pb-6">
                        {[...cardsData, ...cardsData].map((card, index) => (
                            <CreateCard key={index} card={card} />
                        ))}
                    </div>

                    <div className="absolute right-0 top-0 h-full w-8 sm:w-24 z-10 bg-gradient-to-l from-slate-50/70 sm:from-slate-50 to-transparent pointer-events-none"></div>
                </div>

                <div className="w-full overflow-hidden relative mt-8">
                    <div className="absolute left-0 top-0 h-full w-8 sm:w-24 z-10 bg-gradient-to-r from-slate-50/70 sm:from-slate-50 to-transparent pointer-events-none"></div>

                    <div className="marquee-inner marquee-reverse flex min-w-[200%] pt-8 pb-6">
                        {[...cardsData, ...cardsData].map((card, index) => (
                            <CreateCard key={index} card={card} />
                        ))}
                    </div>

                    <div className="absolute right-0 top-0 h-full w-8 sm:w-24 z-10 bg-gradient-to-l from-slate-50/70 sm:from-slate-50 to-transparent pointer-events-none"></div>
                </div>

            </div>
        </section>
    );
};

export default TestimonialsSection;
