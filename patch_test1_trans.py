# -*- coding: utf-8 -*-
import re

html_path = '/Users/nguyetpham/Desktop/WEBSITE/SPEAKING MOCK TESTS/test 1/test01-index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    # Ans 0
    "Vâng, tôi có. Tôi thường ăn thức ăn đường phố vào buổi tối cùng với bạn bè. Tôi thích nó vì nó ngon và giá cả phải chăng. Nó cũng cho tôi cơ hội thử các món ăn địa phương khác nhau.":
    "Vâng, tôi có. Tôi thường <strong>ăn thức ăn đường phố vào buổi tối cùng với bạn bè</strong>. Tôi thích nó vì nó <strong>ngon</strong> và <strong>giá cả phải chăng</strong>. Nó cũng cho tôi cơ hội <strong>thử các món ăn địa phương khác nhau</strong>.",
    
    # Ans 1
    "Vâng, tôi có. Tôi thích ăn thức ăn đường phố bất cứ khi nào có thời gian rảnh. Nó thường ngon, rẻ và dễ tìm. Ngoài ra, việc thử các món ăn đường phố khác nhau giúp tôi trải nghiệm văn hóa và ẩm thực địa phương.":
    "Vâng, tôi có. Tôi <strong>thích ăn thức ăn đường phố bất cứ khi nào có thời gian rảnh</strong>, <strong>đặc biệt là vào buổi tối</strong>. Nó thường <strong>ngon</strong>, <strong>rẻ</strong> và <strong>dễ tìm</strong>. Ngoài ra, việc thử các món ăn đường phố khác nhau giúp tôi <strong>trải nghiệm văn hóa và ẩm thực địa phương</strong>.",

    # Ans 2
    "Có rất nhiều món ăn đường phố nổi tiếng ở nước tôi. Một số món phổ biến là bánh mì, phở và bánh tráng nướng. Nhiều người thích chúng vì chúng ngon và dễ tìm.":
    "Có rất nhiều món ăn đường phố nổi tiếng ở nước tôi như <strong>bánh mì</strong>, <strong>phở</strong> và <strong>bánh xèo</strong>. Nhiều người thích chúng vì chúng <strong>ngon</strong> và <strong>dễ tìm</strong>.",
    
    # Ans 3
    "Có rất nhiều món ăn đường phố nổi tiếng ở Việt Nam, như bánh mì, phở và bánh tráng nướng. Những món ăn này phổ biến vì chúng đậm đà hương vị, tiện lợi và giá cả hợp lý. Chúng cũng được coi là phần quan trọng của văn hóa ẩm thực Việt Nam.":
    "Có rất nhiều món ăn đường phố nổi tiếng ở Việt Nam, như <strong>bánh mì</strong>, <strong>phở</strong> và <strong>bánh xèo</strong>. Những món ăn này phổ biến vì chúng <strong>đậm đà hương vị</strong>, <strong>tiện lợi</strong> và <strong>giá cả hợp lý</strong>. Chúng cũng được <strong>coi là phần quan trọng của văn hóa ẩm thực Việt Nam</strong>.",
    
    # Ans 4
    "Một lợi ích là nó thường rẻ hơn so với ăn ở nhà hàng. Một ưu điểm khác là tiết kiệm thời gian vì thức ăn được chuẩn bị nhanh chóng. Nó cũng giúp mọi người trải nghiệm văn hóa địa phương thông qua các món ăn truyền thống.":
    "Một lợi ích là nó thường <strong>rẻ hơn so với ăn ở nhà hàng</strong>. Một ưu điểm khác là <strong>tiết kiệm thời gian</strong> vì thức ăn được <strong>chuẩn bị nhanh chóng</strong>. Nó cũng giúp mọi người <strong>trải nghiệm văn hóa địa phương thông qua các món ăn truyền thống</strong>.",
    
    # Ans 5
    "Một lợi ích lớn là thức ăn đường phố thường có giá phải chăng hơn bữa ăn ở nhà hàng. Ngoài ra, nó rất tiện lợi vì mọi người có thể mua đồ ăn nhanh chóng khi bận rộn. Hơn nữa, thức ăn đường phố giúp mọi người tìm hiểu thêm về truyền thống địa phương và văn hóa ẩm thực.":
    "Một lợi ích lớn là thức ăn đường phố thường có <strong>giá phải chăng hơn bữa ăn ở nhà hàng</strong>. Ngoài ra, nó rất <strong>tiện lợi</strong> vì mọi người có thể <strong>mua đồ ăn nhanh chóng</strong> khi bận rộn. Hơn nữa, thức ăn đường phố giúp mọi người <strong>tìm hiểu thêm về truyền thống địa phương và văn hóa ẩm thực</strong>.",

    # Ans 6
    "Vâng, tôi có. Tôi thường đi cà phê vào cuối tuần. Tôi tận hưởng không khí thư giãn, và điều đó giúp tôi giảm bớt căng thẳng sau một tuần bận rộn.":
    "Vâng, tôi có. Tôi <strong>thường đi cà phê</strong> <strong>vào thời gian rảnh</strong>, <strong>đặc biệt</strong> là <strong>vào cuối tuần</strong>. Tôi <strong>tận hưởng</strong> <strong>không khí thư giãn</strong>, và điều đó giúp tôi <strong>giảm bớt căng thẳng sau một tuần bận rộn</strong>.",
    
    # Ans 7
    "Vâng, tôi có. Tôi thường ghé các quán cà phê trong thời gian rảnh vì chúng mang lại không gian thoải mái và thư giãn. Đó là những nơi tuyệt vời để giải tỏa đầu óc, thưởng thức đồ uống và thoát khỏi căng thẳng hàng ngày.":
    "Vâng, tôi có. Tôi thường <strong>ghé các quán cà phê trong thời gian rảnh</strong>, <strong>đặc biệt là vào cuối tuần</strong>. Điều này là do chúng <strong>mang lại không gian thoải mái và thư giãn</strong>. Đó là những nơi tuyệt vời để <strong>giải tỏa đầu óc</strong>, <strong>thưởng thức đồ uống</strong> và <strong>thoát khỏi căng thẳng hàng ngày</strong>.",
    
    # Ans 8
    "Tôi thường đến đó với bạn bè. Chúng tôi thường trò chuyện về việc học tập và cuộc sống hàng ngày. Đó là một cách tốt để thắt chặt tình bạn của chúng tôi.":
    "Tôi thường <strong>đến đó với bạn bè</strong>. Chúng tôi thường <strong>trò chuyện về việc học tập và cuộc sống hàng ngày</strong>. Đó là một cách tốt để <strong>thắt chặt tình bạn của chúng tôi</strong>.",
    
    # Ans 9
    "Tôi thường đến đó với bạn bè hoặc đồng nghiệp. Chúng tôi thường gặp nhau để cập nhật tin tức, trao đổi ý kiến, hoặc đơn giản là dành thời gian bên nhau. Những cuộc gặp gỡ này giúp củng cố mối quan hệ của chúng tôi.":
    "Tôi thường <strong>đến đó với bạn bè hoặc</strong> <strong>đồng nghiệp</strong>. Chúng tôi thường gặp nhau để <strong>cập nhật tin tức</strong>, <strong>trao đổi</strong> <strong>ý kiến</strong>, hoặc đơn giản là <strong>dành thời gian bên nhau</strong>. Những cuộc gặp gỡ này giúp <strong>củng cố mối quan hệ của chúng tôi</strong>.",
    
    # Ans 10
    "Tôi thường uống cà phê và nói chuyện với bạn bè. Đôi khi, tôi cũng đọc sách hoặc làm việc. Nó giúp tôi tập trung và làm việc hiệu quả hơn.":
    "Tôi thường <strong>uống cà phê</strong> và <strong>nói chuyện với bạn bè</strong>. Đôi khi, tôi cũng <strong>đọc sách</strong> hoặc <strong>làm việc</strong>. Nó giúp tôi <strong>tập trung và làm việc hiệu quả hơn</strong>.",
    
    # Ans 11
    "Tôi thường thưởng thức một tách cà phê khi đang đọc sách, làm việc hoặc trò chuyện với bạn bè. Đôi khi, tôi cũng tận dụng không gian yên tĩnh để tập trung vào những công việc quan trọng.":
    "Tôi thường <strong>thưởng thức một tách cà phê khi đang đọc sách</strong>, <strong>làm việc</strong> hoặc <strong>trò chuyện với bạn bè</strong>. Đôi khi, tôi cũng <strong>tận dụng không gian yên tĩnh để tập trung vào những công việc quan trọng</strong>.",
    
    # Ans 12
    "À, nếu tôi phải gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp, tôi sẽ khuyên anh ấy đi làm.\n\nTrước hết, việc có một công việc sẽ giúp anh ấy tích lũy được những kinh nghiệm thực tế quý báu. Bằng cách làm việc trong môi trường chuyên nghiệp, anh ấy có thể phát triển các kỹ năng quan trọng, học cách vận hành của doanh nghiệp và hiểu rõ hơn về sở thích nghề nghiệp của mình. Kinh nghiệm này sẽ rất hữu ích cho sự phát triển lâu dài của anh ấy.\n\nThứ hai, đi làm giúp anh ấy trở nên độc lập về tài chính. Anh ấy có thể tự kiếm thu nhập, tự trang trải cuộc sống và giảm bớt gánh nặng tài chính cho gia đình. Ngoài ra, đi làm có thể giúp anh ấy xây dựng mạng lưới quan hệ chuyên nghiệp cho các cơ hội tương lai.\n\nTôi không khuyên học thạc sĩ vì nó đòi hỏi sự đầu tư lớn về thời gian và tiền bạc. Nếu không có đủ kinh nghiệm làm việc, anh ấy có thể không được hưởng lợi đầy đủ từ việc học nâng cao.\n\nCòn về việc nghỉ một năm (gap year), phương án này kém phù hợp hơn vì anh ấy có thể mất động lực và lãng phí thời gian quý báu.\n\nTóm lại, tôi tin rằng đi làm là lựa chọn tốt nhất trong tình huống này.":
    "À, nếu tôi phải <strong>gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp</strong>, tôi sẽ <strong>khuyên</strong> <strong>anh ấy đi làm</strong>.\n\nTrước hết, việc có một công việc sẽ giúp anh ấy tích lũy được những kinh nghiệm thực tế quý báu. Bằng cách làm việc trong môi trường chuyên nghiệp, anh ấy có thể phát triển các kỹ năng quan trọng, học cách vận hành của doanh nghiệp và hiểu rõ hơn về sở thích nghề nghiệp của mình. Kinh nghiệm này sẽ rất hữu ích cho sự phát triển lâu dài của anh ấy.\n\nThứ hai, đi làm giúp anh ấy trở nên độc lập về tài chính. Anh ấy có thể tự kiếm thu nhập, tự trang trải cuộc sống và giảm bớt gánh nặng tài chính cho gia đình. Ngoài ra, đi làm có thể giúp anh ấy xây dựng mạng lưới quan hệ chuyên nghiệp cho các cơ hội tương lai.\n\nTôi không khuyên học thạc sĩ vì nó đòi hỏi sự đầu tư lớn về thời gian và tiền bạc. Nếu không có đủ kinh nghiệm làm việc, anh ấy có thể không được hưởng lợi đầy đủ từ việc học nâng cao.\n\nCòn về việc nghỉ một năm (gap year), phương án này kém phù hợp hơn vì anh ấy có thể mất động lực và lãng phí thời gian quý báu.\n\nTóm lại, tôi tin rằng đi làm là lựa chọn tốt nhất trong tình huống này.",

    # Ans 13
    "À, nếu tôi phải gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp, tôi sẽ khuyên anh ấy đi làm.\n\nTrước hết, việc có một công việc sẽ giúp anh ấy tích lũy được những kinh nghiệm thực tế quý báu. Bằng cách làm việc trong môi trường chuyên nghiệp, anh ấy có thể phát triển các kỹ năng quan trọng, học cách vận hành của doanh nghiệp và hiểu rõ hơn về sở thích nghề nghiệp của mình. Kinh nghiệm này sẽ rất hữu ích cho sự phát triển lâu dài của anh ấy.\n\nThứ hai, đi làm giúp anh ấy trở nên độc lập về tài chính. Anh ấy có thể tự kiếm thu nhập, tự trang trải cuộc sống và giảm bớt gánh nặng tài chính cho gia đình. Ngoài ra, đi làm có thể giúp anh ấy xây dựng mạng lưới quan hệ chuyên nghiệp cho các cơ hội tương lai.\n\nTôi không khuyên học thạc sĩ vì nó đòi hỏi sự đầu tư lớn về thời gian và tiền bạc. Nếu không có đủ kinh nghiệm làm việc, anh ấy có thể không được hưởng lợi đầy đủ từ việc học nâng cao.\n\nCòn về việc nghỉ một năm (gap year), phương án này ít phù hợp hơn vì anh ấy có thể mất thói quen học tập và làm việc. Hơn nữa, việc dành một năm không có mục tiêu rõ ràng có thể làm chậm tiến trình sự nghiệp.\n\nTóm lại, tôi tin rằng đi làm là lựa chọn tốt nhất trong tình huống này.":
    "À, nếu tôi phải <strong>gợi ý những gì em trai tôi nên làm sau khi tốt nghiệp</strong>, tôi sẽ <strong>khuyên</strong> <strong>anh ấy đi làm</strong>.\n\nTrước hết, việc có một công việc sẽ giúp anh ấy tích lũy được những kinh nghiệm thực tế quý báu. Bằng cách làm việc trong môi trường chuyên nghiệp, anh ấy có thể phát triển các kỹ năng quan trọng, học cách vận hành của doanh nghiệp và hiểu rõ hơn về sở thích nghề nghiệp của mình. Kinh nghiệm này sẽ rất hữu ích cho sự phát triển lâu dài của anh ấy.\n\nThứ hai, đi làm giúp anh ấy trở nên độc lập về tài chính. Anh ấy có thể tự kiếm thu nhập, tự trang trải cuộc sống và giảm bớt gánh nặng tài chính cho gia đình. Ngoài ra, đi làm có thể giúp anh ấy xây dựng mạng lưới quan hệ chuyên nghiệp cho các cơ hội tương lai.\n\nTôi không khuyên học thạc sĩ vì nó đòi hỏi sự đầu tư lớn về thời gian và tiền bạc. Nếu không có đủ kinh nghiệm làm việc, anh ấy có thể không được hưởng lợi đầy đủ từ việc học nâng cao.\n\nCòn về việc nghỉ một năm (gap year), phương án này ít phù hợp hơn vì anh ấy có thể mất thói quen học tập và làm việc. Hơn nữa, việc dành một năm không có mục tiêu rõ ràng có thể làm chậm tiến trình sự nghiệp.\n\nTóm lại, tôi tin rằng đi làm là lựa chọn tốt nhất trong tình huống này.",
    
    # Ans 14
    "Ăn trưa tại căng tin trường học mang lại một số lợi ích.\n\nMột ưu điểm lớn là nó rất tiện lợi. Điều này là do học sinh không cần phải rời trường để tìm kiếm thức ăn. Nhờ vậy, họ có thể ăn trưa dễ dàng và thoải mái hơn.\n\nMột khía cạnh tích cực khác là tiết kiệm thời gian. Vì căng tin nằm trong khuôn viên trường nên học sinh có thể mua bữa ăn nhanh chóng. Do đó, họ có nhiều thời gian hơn để nghỉ ngơi hoặc chuẩn bị cho các tiết học tiếp theo.\n\nMột tác động có lợi nữa là các bữa ăn tại căng tin thường rẻ. Điều này có nghĩa là học sinh có thể thưởng thức bữa trưa với giá cả hợp lý. Điều này giúp họ tiết kiệm tiền.\n\nMột lợi ích bổ sung là học sinh có thể dành nhiều thời gian hơn cho bạn bè của mình. Ví dụ, họ có thể ăn trưa cùng nhau và trò chuyện về việc học tập hoặc cuộc sống hàng ngày. Kết quả là, họ có thể xây dựng các mối quan hệ bền chặt hơn.\n\nTóm lại, ăn trưa tại căng tin trường học có một số lợi ích rõ ràng như đã nêu trên.":
    "Có một số <strong>lợi ích</strong> của việc <strong>ăn trưa tại căng tin trường học</strong>.\n\nMột ưu điểm lớn là nó rất tiện lợi. Điều này là do học sinh không cần phải rời trường để tìm kiếm thức ăn. Nhờ vậy, họ có thể ăn trưa dễ dàng và thoải mái hơn.\n\nMột khía cạnh tích cực khác là tiết kiệm thời gian. Vì căng tin nằm trong khuôn viên trường nên học sinh có thể mua bữa ăn nhanh chóng. Do đó, họ có nhiều thời gian hơn để nghỉ ngơi hoặc chuẩn bị cho các tiết học tiếp theo.\n\nMột tác động có lợi nữa là các bữa ăn tại căng tin thường rẻ. Điều này có nghĩa là học sinh có thể thưởng thức bữa trưa với giá cả hợp lý. Điều này giúp họ tiết kiệm tiền.\n\nMột lợi ích bổ sung là học sinh có thể dành nhiều thời gian hơn cho bạn bè của mình. Ví dụ, họ có thể ăn trưa cùng nhau và trò chuyện về việc học tập hoặc cuộc sống hàng ngày. Kết quả là, họ có thể xây dựng các mối quan hệ bền chặt hơn.\n\nTóm lại, ăn trưa tại căng tin trường học có một số lợi ích rõ ràng như đã nêu trên.",
    
    # Ans 15
    "Ăn trưa tại căng tin trường học mang lại một số lợi ích.\n\nMột ưu điểm lớn là nó cực kỳ tiện lợi cho học sinh. Vì căng tin nằm ngay trong khuôn viên trường nên học sinh không cần di chuyển ra ngoài để mua đồ ăn. Điều này giúp giờ ăn trưa trở nên thoải mái và ít căng thẳng hơn.\n\nMột khía cạnh tích cực khác là ăn uống tại căng tin giúp tiết kiệm một lượng thời gian đáng kể. Điều này là do học sinh có thể nhanh chóng mua bữa ăn của mình và quay lại với các hoạt động học tập. Nhờ vậy, họ có nhiều thời gian hơn để thư giãn hoặc chuẩn bị cho các bài học sắp tới.\n\nMột tác động có lợi nữa là các bữa ăn ở căng tin thường có giá cả phải chăng. So với nhiều nhà hàng hoặc quán cà phê, đồ ăn căng tin thường có giá hợp lý. Do đó, học sinh có thể quản lý chi tiêu hàng ngày hiệu quả hơn.\n\nMột lợi ích bổ sung là học sinh có thể dành nhiều thời gian hơn cho bạn bè của họ. Việc ăn trưa cùng nhau mang lại cơ hội giao lưu và tương tác xã hội. Do đó, học sinh có thể củng cố tình bạn và phát triển các mối quan hệ tốt hơn với bạn học của mình.\n\nTóm lại, ăn trưa tại căng tin trường học có một số lợi ích rõ ràng như đã nêu trên.":
    "Có một số <strong>lợi ích</strong> của việc <strong>ăn trưa tại căng tin trường học</strong>.\n\nMột ưu điểm lớn là nó cực kỳ tiện lợi cho học sinh. Vì căng tin nằm ngay trong khuôn viên trường nên học sinh không cần di chuyển ra ngoài để mua đồ ăn. Điều này giúp giờ ăn trưa trở nên thoải mái và ít căng thẳng hơn.\n\nMột khía cạnh tích cực khác là ăn uống tại căng tin giúp tiết kiệm một lượng thời gian đáng kể. Điều này là do học sinh có thể nhanh chóng mua bữa ăn của mình và quay lại với các hoạt động học tập. Nhờ vậy, họ có nhiều thời gian hơn để thư giãn hoặc chuẩn bị cho các bài học sắp tới.\n\nMột tác động có lợi nữa là các bữa ăn ở căng tin thường có giá cả phải chăng. So với nhiều nhà hàng hoặc quán cà phê, đồ ăn căng tin thường có giá hợp lý. Do đó, học sinh có thể quản lý chi tiêu hàng ngày hiệu quả hơn.\n\nMột lợi ích bổ sung là học sinh có thể dành nhiều thời gian hơn cho bạn bè của họ. Việc ăn trưa cùng nhau mang lại cơ hội giao lưu và tương tác xã hội. Do đó, học sinh có thể củng cố tình bạn và phát triển các mối quan hệ tốt hơn với bạn học của mình.\n\nTóm lại, ăn trưa tại căng tin trường học có một số lợi ích rõ ràng như đã nêu trên.",
    
    # Ans 16
    "Tôi nghĩ nhà trường nên cung cấp thức ăn ngon và đa dạng thực đơn. Họ cũng nên giữ giá cả phải chăng và duy trì môi trường ăn uống sạch sẽ. Kết quả là, nhiều học sinh hơn có thể chọn ăn tại căng tin.":
    "Tôi nghĩ nhà trường nên <strong>cung cấp</strong> <strong>thức ăn ngon</strong> <strong>và giá cả phải chăng</strong>. Họ cũng có thể <strong>cung cấp nhiều</strong> <strong>lựa chọn</strong> thức ăn hơn. Kết quả là, nhiều học sinh hơn có thể <strong>chọn ăn ở đó</strong>.",

    # Ans 17
    "Trường học có thể thu hút nhiều học sinh hơn bằng cách cải thiện cả chất lượng và sự đa dạng của thực phẩm. Ngoài ra, việc duy trì giá cả hợp lý và môi trường sạch sẽ là rất quan trọng. Nhà trường cũng nên thường xuyên thu thập phản hồi của học sinh để đáp ứng nhu cầu của họ tốt hơn.":
    "Trường học có thể thu hút nhiều học sinh hơn bằng cách <strong>cải thiện cả chất lượng và sự đa dạng của thực phẩm</strong>. Ngoài ra, việc <strong>duy trì giá cả hợp lý và môi trường sạch sẽ</strong> là rất quan trọng. Nhà trường cũng nên thường xuyên <strong>thu thập phản hồi của học sinh để đáp ứng nhu cầu của họ tốt hơn</strong>.",
    
    # Ans 18
    "Một bất lợi là căng tin có thể rất đông đúc trong giờ ăn trưa. Học sinh có thể phải đợi lâu để mua đồ ăn. Một hạn chế khác là một số học sinh có thể không thích sự lựa chọn đồ ăn bị hạn chế.":
    "Căng tin <strong>có thể rất đông đúc trong giờ ăn trưa</strong>. Học sinh cũng có thể <strong>có</strong> <strong>lựa chọn</strong> <strong>đồ ăn bị hạn chế</strong>. Do đó, một số học sinh <strong>có thể không thích ăn ở đó</strong>.",
    
    # Ans 19
    "Một bất lợi là căng tin trường học thường đông đúc, đặc biệt là vào giờ cao điểm. Kết quả là học sinh phải tốn thời gian xếp hàng chờ đợi lâu. Một hạn chế khác là thực đơn có thể không phải lúc nào cũng thỏa mãn các khẩu vị hoặc nhu cầu ăn kiêng khác nhau.":
    "Một bất lợi là <strong>căng tin trường học thường đông đúc</strong>, <strong>đặc biệt là vào</strong> <strong>giờ</strong> <strong>cao điểm</strong>. Kết quả là học sinh có thể <strong>tốn thời gian xếp hàng chờ đợi lâu</strong>. Một hạn chế khác là thực đơn <strong>có thể không phải lúc nào cũng thỏa mãn các khẩu vị hoặc nhu cầu ăn kiêng khác nhau</strong>.",
    
    # Ans 20
    "Nhà trường nên sử dụng nguyên liệu tươi ngon và tuân thủ các quy định về an toàn thực phẩm. Họ cũng nên giữ nhà bếp sạch sẽ và thường xuyên kiểm tra chất lượng thực phẩm. Ngoài ra, nhà trường nên cung cấp các bữa ăn cân bằng với rau, thịt và trái cây.":
    "Nhà trường nên <strong>sử dụng nguyên liệu tươi ngon</strong>. Họ cũng nên <strong>giữ căng tin sạch sẽ</strong>. Điều này có thể giúp học sinh <strong>giữ gìn sức khỏe</strong>.",
    
    # Ans 21
    "Nhà trường nên tuân thủ nghiêm ngặt các tiêu chuẩn an toàn thực phẩm và thường xuyên kiểm tra chất lượng nguyên liệu. Họ cũng nên đảm bảo thức ăn được chuẩn bị trong môi trường sạch sẽ bởi nhân viên được đào tạo. Hơn nữa, nhà trường nên cung cấp các bữa ăn cân đối chứa đầy đủ chất dinh dưỡng để hỗ trợ sức khỏe và sự phát triển của học sinh.":
    "Nhà trường nên <strong>tuân thủ nghiêm ngặt các tiêu chuẩn an toàn thực phẩm</strong> và <strong>thường xuyên kiểm tra chất lượng</strong> <strong>nguyên liệu</strong>. Họ cũng nên <strong>đảm bảo thức ăn được chuẩn bị trong môi trường sạch sẽ bởi nhân viên được đào tạo</strong>. Hơn nữa, nhà trường nên <strong>cung cấp các bữa ăn cân đối chứa đầy đủ</strong> <strong>chất dinh dưỡng</strong> để hỗ trợ sức khỏe và sự phát triển của học sinh."
}

for k, v in replacements.items():
    if k in content:
        content = content.replace(f'<div class="translation-text" style="display: none; white-space: pre-line;">{k}</div>', f'<div class="translation-text" style="display: none; white-space: pre-line;">{v}</div>')
    else:
        # Sometimes there's newlines that got collapsed in my dict.
        # Let's do a more robust replace by stripping tags to find the match.
        import collections
        # Let's just use regex to replace between translation-text tags where content matches
        escaped_k = re.escape(k).replace(r'\n', r'\n?')
        content = re.sub(f'(<div class="translation-text"[^>]*>){escaped_k}(</div>)', rf'\1{v}\2', content)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching Vietnamese bolds.")
