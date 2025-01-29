const LandingSection = () => {
    return (
      <div className="space-y-8 py-12 pt-20">
        <div className="">
          <h1 className="text-4xl md:text-3xl font-medium mb-2 text-center ">
            <span className="inline-block relative">
                <span className="relative z-10 font-bold">About the Question Bank</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span>
          </h1>
        </div>
        {/* First section */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-sky-200">
          <div className=" font-bold text-lg p-6 underline">
            <h1 className="text-2xl md:text-3xl font-medium mb-2">
              What is the purpose of the Question Bank?
            </h1>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-lg">
              We want the Question Bank to help social purpose organisations to identify the most important questions to ask in their area of interest and help people to work together to answer them.
              We believe in <span className="inline-block relative">
                <span className="relative z-10 font-bold">open infrastructure</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span>, the power of <span className="inline-block relative">
                <span className="relative z-10 font-bold">questions</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> and the power of <span className="inline-block relative">
                <span className="relative z-10 font-bold">collaboration</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span>.
            </p>
          </div>
        </div>
  
        {/* Second section */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-pink-200">
          <div className=" font-bold text-lg p-6 underline">
            <h2 className="text-2xl md:text-3xl font-medium mb-2">
              How does the Question Bank work?
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-lg">
              The Question Bank is a platform for people to <span className="inline-block relative">
                <span className="relative z-10 font-bold">ask questions</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span>, allow community users to <span className="inline-block relative">
                <span className="relative z-10 font-bold">determine</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> the most important questions, & <span className="inline-block relative">
                <span className="relative z-10 font-bold">take action</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span> on them.
              Questions are asked by users with a focus on social purpose organisations and their areas of interest.
              We show similar questions both on submission and on question detail pages. 
              Community users can <span className="inline-block relative">
                <span className="relative z-10 font-bold">vote</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> on questions and the most important questions will be shown at the top of the list.
              Users can also <span className="inline-block relative">
                <span className="relative z-10 font-bold">follow</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span> and <span className="inline-block relative">
                <span className="relative z-10 font-bold">endorse</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> questions to get notifications when they are updated or responded to.
            </p>
          </div>
        </div>
  
        {/* Third section */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-sky-200">
          <div className=" font-bold text-lg p-6 underline">
            <h2 className="text-2xl md:text-3xl font-medium mb-2">
              Why is there a paid for version and what is it?
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-lg">
              We want the public Question Bank to be <span className="font-bold">free to use for everyone</span>. To fund the open infrastructure we have a paid for version which allows groups to have{' '}     
              <span className="inline-block relative">
                <span className="relative z-10 font-bold">private</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span> questions, {' '}
              <span className="inline-block relative">
                <span className="relative z-10 font-bold">kanban</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> prioritisation features, {' '}
              <span className="inline-block relative">
                <span className="relative z-10 font-bold">tagging</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span> options, and {' '}
              <span className="inline-block relative">
                <span className="relative z-10 font-bold">ranking</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span> approaches.
            </p>
          </div>
        </div>
  
        {/* Fourth section - AI */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-pink-200">
          <div className=" font-bold text-lg p-6 underline">
            <h2 className="text-2xl md:text-3xl font-medium mb-2">
              Do we use AI in the Question Bank?
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-lg">
              Yes we use some AI to <span className="inline-block relative">
                <span className="relative z-10 font-bold">create embeddings</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
              </span> of the Questions on submission so that we can identify similar questions. We believe in using AI where it is  <span className="inline-block relative">
                <span className="relative z-10 font-bold">effective</span>
                <span className="absolute bottom-0 left-0 w-full h-2 bg-sky-200/50"></span>
              </span>, but use it sparingly.
            </p>
          </div>
        </div>
  
        {/* Fifth section - Creator */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-sky-200">
          <div className=" font-bold text-lg p-6 underline">
            <h2 className="text-2xl md:text-3xl font-medium mb-2">
              Who created and maintains the Question Bank?
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-lg">
              The Question Bank was created by and is maintained by <span className="inline-block relative">
                <a href="https://dataforaction.org.uk/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800">
                  <span className="relative z-10 font-bold">Data For Action</span>
                  <span className="absolute bottom-0 left-0 w-full h-2 bg-pink-200/50"></span>
                </a>
              </span>.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default LandingSection; 