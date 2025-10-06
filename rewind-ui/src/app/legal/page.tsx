"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";

export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <BlobBackground 
        colors={["#8B5CF6", "#EC4899", "#1E40AF"]}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-4 md:px-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-6">
            <h1 
              className="text-5xl md:text-7xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
            >
              LEGAL
            </h1>
            <div className="flex items-center justify-center space-x-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500"></div>
              <p className="text-xl md:text-2xl text-purple-400 font-semibold uppercase tracking-wider">
                Legal Information & Disclaimers
              </p>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500"></div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8 text-white/90">
            {/* Riot Games Legal Notice */}
            <section className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Riot Games Legal Notice
              </h2>
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p>
                  Rift Rewind was created under Riot Games&apos; &quot;Legal Jibber Jabber&quot; policy using assets owned by Riot Games. 
                  Riot Games does not endorse or sponsor this project.
                </p>
                <p>
                  League of Legends™ and all associated logos, champion names, character designs, images, artwork, and other 
                  content displayed on this website are trademarks, service marks, and/or registered trademarks of Riot Games, Inc.
                </p>
                <p>
                  All game-related content, including but not limited to champion splash arts, icons, rank emblems, position icons, 
                  and other visual assets are the exclusive property of Riot Games, Inc. and are used in accordance with their 
                  Legal Jibber Jabber policy.
                </p>
              </div>
            </section>

            {/* AWS Notice */}
            <section className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Amazon Web Services
              </h2>
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p>
                  This project was created as part of the AWS and Riot Games Hackathon. Amazon Web Services, AWS, and all 
                  related marks are trademarks of Amazon.com, Inc. or its affiliates.
                </p>
                <p>
                  This website is powered by Amazon Web Services infrastructure. AWS does not endorse or sponsor this project 
                  beyond the scope of the hackathon.
                </p>
              </div>
            </section>

            {/* Project Information */}
            <section className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                About This Project
              </h2>
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p>
                  Rift Rewind is a fan-made project created by passionate League of Legends players and developers. 
                  This website provides personalized year-end recaps and statistics for League of Legends players using 
                  data from the Riot Games API and AI-powered insights from Amazon Bedrock.
                </p>
                <p>
                  This project is not affiliated with, endorsed by, or officially connected to Riot Games, Inc. or 
                  Amazon Web Services, Inc. in any way beyond the scope of the hackathon participation.
                </p>
              </div>
            </section>

            {/* Copyright */}
            <section className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Copyright & Intellectual Property
              </h2>
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p>
                  © 2025 Rift Rewind. The source code and original content created for this project are the property 
                  of the project contributors.
                </p>
                <p>
                  All third-party trademarks, service marks, trade names, and logos referenced on this website remain 
                  the property of their respective owners. Use of these marks does not imply any affiliation with or 
                  endorsement by their owners.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-black/30 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Questions or Concerns?
              </h2>
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p>
                  If you have any questions or concerns regarding the content on this website or its compliance with 
                  Riot Games&apos; policies, please contact us through our{" "}
                  <a 
                    href="https://github.com/duncanista/rift-rewind" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/50 underline-offset-4 transition-colors"
                  >
                    GitHub repository
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Last Updated */}
            <div className="text-center text-white/50 text-sm pt-4">
              Last updated: October 6, 2025
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
